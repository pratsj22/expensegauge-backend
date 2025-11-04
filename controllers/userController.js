import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

export const signup = async (req, res) => {
    const { name, username, password, role } = req.body;
    if( !name || !username || !password || ! role) return res.status(403).send("Please enter all details")
    if (await User.findOne({ username })) {
        return res.status(400).send({ "message": "Username already exists" })
    }
    const saltrounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltrounds);
    const newuser = new User({
        name,
        username,
        password: hashedPassword,
        role
    })
    const accessToken = jwt.sign(
        { userId: newuser._id, role: role },
        process.env.ACCESS_SECRET,
        { "expiresIn": "1Hour" }
    )
    const refreshToken = jwt.sign(
        { userId: newuser._id },
        process.env.REFRESH_SECRET,
        { "expiresIn": "30days" }
    )
    newuser.refreshTokens.push({ token: refreshToken });
    await newuser.save();

    return res.status(200).send({ accessToken, refreshToken })
}

export const login = async (req, res) => {
    const { username, password } = req.body;
    if( !username || !password ) return res.status(403).send("Please enter all details")


    const user = await User.findOne({ username })
    if (!user) {
        return res.status(404).send({ "message": "User does not exist" })
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).send({"code": "INVALID_PASSWORD", "message": "Invalid username or password" })
    }
    const accessToken = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.ACCESS_SECRET,
        { "expiresIn": "1Hour" }
    )
    const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.REFRESH_SECRET,
        { "expiresIn": "30days" }
    )
    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > 5) {
        user.refreshTokens.shift(); // remove oldest
    }
    await user.save();

    return res.status(200).send({ accessToken, refreshToken, name:user.name,role:user.role })
}

export const verifyAccess = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        console.log(err);
        return res.sendStatus(401); // Token expired/invalid
    }
};

export const refresh = async (req, res) => {
    const { refreshToken } = req.body;
    console.log("enter refresh");

    if (!refreshToken)
        return res.sendStatus(401);

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        const user = await User.findById(decoded.userId)

        if (!user) return res.sendStatus(403);

        // Check if refreshToken exists in DB
        const tokenIndex = user.refreshTokens.findIndex(rt => rt.token === refreshToken);
        if (tokenIndex === -1) return res.sendStatus(403); // token reuse/invalid
        console.log(tokenIndex);

        // Rotate: remove old, issue new
        user.refreshTokens.splice(tokenIndex, 1); // remove old
        const newRefreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_SECRET,
            { expiresIn: '30d' }
        );
        user.refreshTokens.push({ token: newRefreshToken });

        await user.save();

        const newAccessToken = jwt.sign(
            { userId: user._id,role:user.role },
            process.env.ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        return res.sendStatus(403); // Token expired/invalid
    }
}

export const changePassword=async(req,res)=>{
    try {
        console.log("enter change");
        
        const{ oldPassword,newPassword}= req.body;
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).send({ "message": "User does not exist" })
        }
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            return res.status(401).send({"code": "INVALID_CURRENT_PASSWORD", "message": "Invalid old password" })
        }
        const saltrounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltrounds);
        user.password= hashedNewPassword;
        await user.save();
        
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const logout = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.sendStatus(400);
    console.log("inside logout");

    try {
        const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        const user = await User.findById(payload.userId);
        if (!user) return res.sendStatus(403);

        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
        await user.save();

        res.sendStatus(204);
    } catch (err) {
        res.sendStatus(403);
    }
};