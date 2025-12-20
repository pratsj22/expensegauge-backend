import PDFDocument from 'pdfkit';
import { sendEmail } from '../utils/emailService.js';
import Expense from '../models/expenseModel.js';
import User from '../models/userModel.js';
import path from 'path';

// --- Constants & Styles ---

const COLORS = {
    primary: '#111827',   // Slate 900
    secondary: '#6B7280', // Gray 500
    accent: '#4F46E5',    // Indigo 600
    income: '#059669',    // Emerald 600
    incomeBG: '#ECFDF5',  // Emerald 50
    expense: '#DC2626',   // Red 600
    expenseBG: '#FEF2F2', // Red 50
    balance: '#2563EB',   // Blue 600
    balanceBG: '#EFF6FF', // Blue 50
    border: '#E5E7EB',    // Gray 200
    white: '#FFFFFF',
    bg: '#F9FAFB',        // Gray 50
    chartGrid: '#F3F4F6'  // Gray 100
};

const CATEGORY_STYLES = {
    'Income': { bg: '#D1FAE5', text: '#065F46' },
    'Food': { bg: '#DBEAFE', text: '#1E40AF' },
    'Transport': { bg: '#E0E7FF', text: '#3730A3' },
    'Housing': { bg: '#FEE2E2', text: '#991B1B' },
    'Utilities': { bg: '#FEF3C7', text: '#92400E' },
    'Entertainment': { bg: '#F3E8FF', text: '#6B21A8' },
    'Health': { bg: '#DCFCE7', text: '#166534' },
    'Other': { bg: '#F3F4F6', text: '#374151' }
};

// --- Helper Functions ---

const drawRoundedRect = (doc, x, y, width, height, radius, fill, stroke) => {
    doc.save();
    if (fill) doc.fillColor(fill).roundedRect(x, y, width, height, radius).fill();
    if (stroke) doc.strokeColor(stroke).lineWidth(1).roundedRect(x, y, width, height, radius).stroke();
    doc.restore();
};

const drawPill = (doc, x, y, text, style) => {
    const paddingH = 8;
    const paddingV = 4;
    doc.font('Helvetica').fontSize(8);
    const textWidth = doc.widthOfString(text);
    const width = textWidth + (paddingH * 2);
    const height = 16;

    drawRoundedRect(doc, x, y - 10, width, height, 8, style.bg);
    doc.fillColor(style.text).text(text, x + paddingH, y - 6);
    return width;
};

const drawHeader = (doc, user, startDate, endDate) => {
    // Logo (Simulated Logo with Shape/Text if file not found)
    // In a real app, you'd use: doc.image('path/to/logo.png', 50, 45, { width: 40 });
    const logoX = 50;
    const logoY = 40;
    drawRoundedRect(doc, logoX, logoY, 40, 40, 8, '#84CC16'); // Green Square Logo
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20).text('EG', logoX + 6, logoY + 12);

    // Report Period (Top Right)
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(8).text('REPORT PERIOD', 400, 45, { align: 'right', width: 150 });
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11).text(`${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 400, 58, { align: 'right', width: 150 });

    // Main Title
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(28).text('Expense Analysis', 50, 100);
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(11).text('Prepared for: ', 50, 135, { continued: true });
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').text(user.name);

    doc.moveTo(50, 165).lineTo(550, 165).strokeColor(COLORS.border).lineWidth(0.5).stroke();
};

const drawSummaryCards = (doc, income, expense, balance) => {
    const y = 185;
    const cardWidth = 155;
    const height = 80;
    const gap = 15;

    // Total Expenses
    drawRoundedRect(doc, 50, y, cardWidth, height, 10, COLORS.white, COLORS.border);
    doc.fillColor(COLORS.secondary).fontSize(8).font('Helvetica-Bold').text('TOTAL EXPENSES', 75, y + 20);
    doc.fillColor(COLORS.primary).fontSize(20).font('Helvetica-Bold').text(`$${expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 75, y + 38);

    // Total Income
    drawRoundedRect(doc, 50 + cardWidth + gap, y, cardWidth, height, 10, COLORS.white, COLORS.border);
    doc.fillColor(COLORS.secondary).fontSize(8).font('Helvetica-Bold').text('TOTAL INCOME', 50 + cardWidth + gap + 25, y + 20);
    doc.fillColor(COLORS.balance).fontSize(20).font('Helvetica-Bold').text(`$${income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 50 + cardWidth + gap + 25, y + 38);

    // Net Balance
    drawRoundedRect(doc, 50 + (cardWidth + gap) * 2, y, cardWidth, height, 10, COLORS.white, COLORS.border);
    doc.fillColor(COLORS.secondary).fontSize(8).font('Helvetica-Bold').text('NET BALANCE', 50 + (cardWidth + gap) * 2 + 25, y + 20);
    const balanceColor = balance >= 0 ? COLORS.income : COLORS.expense;
    const balancePrefix = balance >= 0 ? '+' : '';
    doc.fillColor(balanceColor).fontSize(20).font('Helvetica-Bold').text(`${balancePrefix}$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 50 + (cardWidth + gap) * 2 + 25, y + 38);
};

const drawSpendingTrend = (doc, expenses, x, y, width, height) => {
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(12).text('Spending Trend', x, y);
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(9).text('Daily expenses over the period', x, y + 15);

    const chartY = y + 40;
    const chartHeight = height - 40;

    // Draw Border
    drawRoundedRect(doc, x, chartY, width, chartHeight, 10, COLORS.white, COLORS.border);

    // Mock Data Processing for Trend
    const dailyData = {};
    expenses.filter(e => e.type === 'debit').forEach(e => {
        const d = new Date(e.date).getDate();
        dailyData[d] = (dailyData[d] || 0) + e.amount;
    });

    const days = Object.keys(dailyData).sort((a, b) => a - b);
    if (days.length < 2) {
        doc.fillColor(COLORS.secondary).fontSize(10).text('Not enough data for trend', x + width / 2 - 60, chartY + chartHeight / 2);
        return;
    }

    const maxVal = Math.max(...Object.values(dailyData), 10);
    const stepX = (width - 40) / (days.length - 1);

    // Grid / Line
    doc.save();
    doc.translate(x + 20, chartY + chartHeight - 20);

    // Path for Area
    doc.moveTo(0, 0);
    days.forEach((day, i) => {
        const vx = i * stepX;
        const vy = -(dailyData[day] / maxVal) * (chartHeight - 60);
        doc.lineTo(vx, vy);
    });
    doc.lineTo((days.length - 1) * stepX, 0);
    doc.closePath();
    doc.fillColor(COLORS.balanceBG).fill();

    // Path for Line
    doc.moveTo(0, -(dailyData[days[0]] / maxVal) * (chartHeight - 60));
    days.forEach((day, i) => {
        const vx = i * stepX;
        const vy = -(dailyData[day] / maxVal) * (chartHeight - 60);
        doc.lineTo(vx, vy);
    });
    doc.strokeColor(COLORS.balance).lineWidth(2).stroke();
    doc.restore();
};

const drawCategoryBreakdown = (doc, categoryData, x, y, width, height) => {
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(12).text('Category Breakdown', x, y);
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(9).text('Where your money went', x, y + 15);

    const radius = 60;
    const centerX = x + 70;
    const centerY = y + 90;
    const innerRadius = 35;

    const total = Object.values(categoryData).reduce((a, b) => a + b, 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#EF4444'];

    let startAngle = 0;
    Object.entries(categoryData).sort((a, b) => b[1] - a[1]).forEach(([cat, amount], i) => {
        const sliceAngle = (amount / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);

        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

        doc.save()
            .path(`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`)
            .fill(colors[i % colors.length]);

        startAngle = endAngle;
    });

    // Inner Circle for Donut
    doc.circle(centerX, centerY, innerRadius).fill(COLORS.white);

    // Legend
    let legendY = y + 50;
    Object.entries(categoryData).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([cat, amount], i) => {
        const percentage = Math.round((amount / total) * 100);
        doc.circle(x + 160, legendY + 5, 4).fill(colors[i % colors.length]);
        doc.fillColor(COLORS.primary).font('Helvetica').fontSize(9).text(cat, x + 175, legendY);
        doc.fillColor(COLORS.secondary).text(`${percentage}%`, x + 250, legendY, { align: 'right', width: 30 });
        legendY += 20;
    });
};

const drawTransactionTable = (doc, expenses, startY) => {
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(14).text('Transaction History', 50, startY);

    let y = startY + 30;

    // Header
    drawRoundedRect(doc, 50, y, 500, 30, 5, COLORS.bg);
    doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(9);
    doc.text('Date', 70, y + 10);
    doc.text('Description', 160, y + 10);
    doc.text('Category', 340, y + 10);
    doc.text('Amount', 480, y + 10, { width: 50, align: 'right' });

    y += 35;

    expenses.forEach((exp, index) => {
        if (y > 720) {
            doc.addPage();
            y = 50;
        }

        const isIncome = exp.type === 'credit' || exp.type === 'assign';
        const color = isIncome ? COLORS.income : COLORS.primary;
        const prefix = isIncome ? '+' : '-';
        const catStyle = CATEGORY_STYLES[exp.category] || CATEGORY_STYLES['Other'];

        doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(9).text(new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), 70, y);
        doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9).text(exp.details.substring(0, 30), 160, y);

        drawPill(doc, 340, y + 5, exp.category || 'Other', catStyle);

        doc.fillColor(color).font('Helvetica-Bold').fontSize(9).text(`${prefix}$${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 450, y, { width: 80, align: 'right' });

        doc.moveTo(50, y + 20).lineTo(550, y + 20).strokeColor(COLORS.border).lineWidth(0.5).stroke();
        y += 35;
    });
};

const drawFooter = (doc, pageNum) => {
    const y = 780;
    doc.moveTo(50, y - 10).lineTo(550, y - 10).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(8).text(`Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`, 50, y);
    doc.text(`Page 1 of 1`, 500, y, { align: 'right' });
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
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (type === 'weekly') {
            startDate.setDate(now.getDate() - 7);
        } else if (type === 'yearly') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (type === 'custom') {
            if (req.body.startDate) startDate = new Date(req.body.startDate);
            if (req.body.endDate) endDate = new Date(req.body.endDate);
        } else {
            startDate.setMonth(now.getMonth() - 1);
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
            categoryData[cat] = (categoryData[cat] || 0) + e.amount;
        });

        // --- PDF Generation ---
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            try {
                await sendEmail({
                    to: user.email,
                    subject: `ExpenseGauge Analysis - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
                    text: `Attached is your detailed expense analysis report.`,
                    attachments: [{ filename: `Expense_Analysis_${type || 'Report'}.pdf`, content: pdfData }]
                });
                res.status(200).send({ message: "Report sent" });
            } catch (error) {
                console.error("Email error:", error);
                res.status(500).send("Failed to send email");
            }
        });

        drawHeader(doc, user, startDate, endDate);
        drawSummaryCards(doc, income, expenseTotal, savings);

        drawSpendingTrend(doc, expenses, 50, 285, 250, 180);
        drawCategoryBreakdown(doc, categoryData, 320, 285, 230, 180);

        drawTransactionTable(doc, expenses, 490);
        drawFooter(doc, 1);

        doc.end();

    } catch (error) {
        console.error("Report generation error:", error);
        res.status(500).send("Error generating report");
    }
};
