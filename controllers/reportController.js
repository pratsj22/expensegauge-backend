import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import Expense from '../models/expenseModel.js';
import User from '../models/userModel.js';

// --- Helper Functions for PDF Drawing ---

const COLORS = {
    primary: '#4F46E5', // Indigo
    success: '#10B981', // Green
    danger: '#EF4444',  // Red
    dark: '#1F2937',    // Gray-800
    light: '#F3F4F6',   // Gray-100
    white: '#FFFFFF',
    text: '#374151'
};

const drawHeader = (doc, user, type, startDate, endDate) => {
    // Logo / Brand
    doc.fillColor(COLORS.primary).fontSize(24).font('Helvetica-Bold').text('ExpenseGauge', 50, 50);

    // Title
    doc.fillColor(COLORS.dark).fontSize(16).text(`${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Expense'} Report`, 50, 85);

    // Date Range
    const dateText = `${startDate.toDateString()} - ${endDate.toDateString()}`;
    doc.fontSize(10).fillColor(COLORS.text).text(dateText, 50, 105);

    // User Info
    doc.text(`Generated for: ${user.name} (${user.email})`, 50, 120);

    // Line Separator
    doc.moveTo(50, 140).lineTo(550, 140).strokeColor(COLORS.light).stroke();
};

const drawSummaryCards = (doc, income, expense, balance) => {
    const y = 160;
    const padding = 10;
    const cardWidth = 150;
    const height = 60;

    // Income
    doc.roundedRect(50, y, cardWidth, height, 5).fill(COLORS.light);
    doc.fillColor(COLORS.success).fontSize(10).text('TOTAL INCOME', 60, y + 10);
    doc.fillColor(COLORS.success).fontSize(16).font('Helvetica-Bold').text(`+${income.toLocaleString('en-IN')}`, 60, y + 25);

    // Expense
    doc.roundedRect(225, y, cardWidth, height, 5).fill(COLORS.light);
    doc.fillColor(COLORS.danger).fontSize(10).font('Helvetica').text('TOTAL EXPENSE', 235, y + 10);
    doc.fillColor(COLORS.danger).fontSize(16).font('Helvetica-Bold').text(`-${expense.toLocaleString('en-IN')}`, 235, y + 25);

    // Balance
    doc.roundedRect(400, y, cardWidth, height, 5).fill(COLORS.primary);
    doc.fillColor(COLORS.white).fontSize(10).font('Helvetica').text('NET SAVINGS', 410, y + 10);
    doc.fillColor(COLORS.white).fontSize(16).font('Helvetica-Bold').text(`${balance.toLocaleString('en-IN')}`, 410, y + 25);
};

const drawPieChart = (doc, categoryData, x, y, radius) => {
    let startAngle = 0;
    const total = Object.values(categoryData).reduce((a, b) => a + b, 0);
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

    let i = 0;
    if (total === 0) {
        doc.fillColor(COLORS.light).circle(x, y, radius).fill();
        return;
    }

    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.dark).text('Category Breakdown', x - 50, y - radius - 20);

    // Legend
    let legendY = y - radius + 10;

    Object.entries(categoryData).forEach(([cat, amount]) => {
        const angle = (amount / total) * Math.PI * 2;
        const endAngle = startAngle + angle;

        doc.path(`M ${x} ${y} L ${x + radius * Math.cos(startAngle)} ${y + radius * Math.sin(startAngle)} A ${radius} ${radius} 0 ${angle > Math.PI ? 1 : 0} 1 ${x + radius * Math.cos(endAngle)} ${y + radius * Math.sin(endAngle)} Z`)
            .fill(colors[i % colors.length]);

        // Draw Legend
        doc.rect(x + radius + 20, legendY, 10, 10).fill(colors[i % colors.length]);
        doc.fillColor(COLORS.text).fontSize(10).font('Helvetica').text(`${cat}: ${Math.round((amount / total) * 100)}%`, x + radius + 35, legendY);
        legendY += 15;

        startAngle = endAngle;
        i++;
    });
};

const drawBarChart = (doc, expenses, x, y, width, height) => {
    // Group by date (last 7 days logic or simple daily grouping)
    // For simplicity, let's take aggregated daily totals
    const dailyData = {};
    expenses.forEach(e => {
        const d = new Date(e.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        if (!dailyData[d]) dailyData[d] = 0;
        if (e.type === 'debit') dailyData[d] += e.amount;
    });

    const dates = Object.keys(dailyData).slice(-7); // Show max 7 bars
    const values = dates.map(d => dailyData[d]);
    const maxVal = Math.max(...values, 10);

    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.dark).text('Daily Spending Trend (Last 7 Active Days)', x, y - 20);

    doc.strokeColor(COLORS.light).moveTo(x, y + height).lineTo(x + width, y + height).stroke(); // X Axis
    doc.moveTo(x, y).lineTo(x, y + height).stroke(); // Y Axis

    const barWidth = (width / dates.length) - 10;

    dates.forEach((date, index) => {
        const val = dailyData[date];
        const barHeight = (val / maxVal) * height;
        const currentX = x + 10 + (index * (width / dates.length));
        const currentY = y + height - barHeight;

        doc.rect(currentX, currentY, barWidth, barHeight).fill(COLORS.danger);
        doc.fillColor(COLORS.text).fontSize(8).text(date, currentX, y + height + 5, { width: barWidth, align: 'center' });
    });
};

const drawTransactionTable = (doc, expenses, startY) => {
    let y = startY;

    // Header
    doc.fillColor(COLORS.light).rect(50, y, 500, 20).fill();
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10);
    doc.text('Date', 60, y + 5);
    doc.text('Category', 150, y + 5);
    doc.text('Details', 260, y + 5);
    doc.text('Amount', 480, y + 5);

    y += 25;
    doc.font('Helvetica').fontSize(10);

    expenses.forEach((exp, index) => {
        if (y > 700) { // New Page
            doc.addPage();
            y = 50;
        }

        const color = exp.type === 'debit' ? COLORS.danger : COLORS.success;
        const prefix = exp.type === 'debit' ? '-' : '+';

        doc.fillColor(COLORS.text).text(new Date(exp.date).toLocaleDateString(), 60, y);
        doc.fillColor(COLORS.text).text(exp.category || 'General', 150, y);
        doc.fillColor(COLORS.text).text(exp.details.substring(0, 30), 260, y);
        doc.fillColor(color).text(`${prefix}${exp.amount}`, 480, y);

        doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor(COLORS.light).stroke();
        y += 20;
    });
};

// --- Main Controller ---

export const generateReport = async (req, res) => {
    try {
        const userId = req.userId;
        const { type } = req.body;

        if (!userId) return res.sendStatus(401);

        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (type === 'monthly') {
            startDate.setMonth(now.getMonth() - 1);
        } else if (type === 'weekly') {
            startDate.setDate(now.getDate() - 7);
        } else if (type === 'yearly') {
            startDate.setFullYear(now.getFullYear() - 1);
        } else if (type === 'custom') {
            if (req.body.startDate) startDate = new Date(req.body.startDate);
            if (req.body.endDate) endDate = new Date(req.body.endDate);
        } else {
            startDate.setMonth(now.getMonth() - 1);
        }

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).send("Invalid date format");
        }

        if (startDate > endDate) {
            return res.status(400).send("Start date must be before end date");
        }

        const expenses = await Expense.find({
            userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        const user = await User.findById(userId);
        if (!user || !user.email) return res.status(400).send("User email not found");

        // --- Aggregation ---
        const income = expenses.filter(e => e.type === 'credit' || e.type === 'assign').reduce((sum, e) => sum + e.amount, 0);
        const expenseTotal = expenses.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
        const savings = income - expenseTotal;

        const categoryData = {};
        expenses.filter(e => e.type === 'debit').forEach(e => {
            const cat = e.category || 'Other';
            if (!categoryData[cat]) categoryData[cat] = 0;
            categoryData[cat] += e.amount;
        });

        // --- PDF Generation ---
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `ExpenseGauge Report - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
                text: `Attached is your expense report.`,
                attachments: [{ filename: `report.pdf`, content: pdfData }]
            };
            try {
                await transporter.sendMail(mailOptions);
                res.status(200).send({ message: "Report sent" });
            } catch (error) {
                console.error("Email error:", error);
                res.status(500).send("Failed to send email");
            }
        });

        drawHeader(doc, user, type || 'Custom', startDate, endDate);
        drawSummaryCards(doc, income, expenseTotal, savings);

        // Layout: Pie Char Left, Bar Chart Right? Or stacked.
        drawPieChart(doc, categoryData, 100, 320, 70);
        drawBarChart(doc, expenses, 300, 250, 200, 120);

        drawTransactionTable(doc, expenses, 420);

        doc.end();

    } catch (error) {
        console.error("Report generation error:", error);
        res.status(500).send("Error generating report");
    }
};
