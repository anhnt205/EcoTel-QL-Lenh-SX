const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Report = require('../models/Report');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const { ROLE, JOB_TYPE } = require('../config/config');
const { groupTripsVehicle, groupExcavator, groupProduction, groupTripsVehicleProduction, safeQuery } = require('../utils/reportGrouping'); // ⚠️ đường dẫn đúng tới function của bạn nhé
const {
    runProductionUpdateBackground
} = require('../utils/cron')

async function summariseVehicleOrdersAggFull(jobType, selectedDate, startOfMonth, departmentId, production, metricType) {
    const selectedKey = new Date(selectedDate).toISOString().slice(0, 10);

    const matchStage = {
        $match: {
            workingDate: { $gte: startOfMonth, $lte: selectedDate },
        },
    };
    if (departmentId) {
        matchStage.$match.department = new mongoose.Types.ObjectId(departmentId);
    }

    const result = await Order.aggregate([
        matchStage,
        // Chỉ lấy job loại "VẬN HÀNH KHOAN"
        {
            $lookup: {
                from: 'jobs',
                localField: 'job',
                foreignField: '_id',
                as: 'job',
            },
        },
        { $unwind: '$job' },
        {
            $match: { 'job.type': jobType },
        },
        // Join sang Report
        {
            $lookup: {
                from: 'reports',
                localField: '_id',
                foreignField: 'orderId',
                as: 'reports',
            },
        },
        { $unwind: '$reports' },
        // Join sang Shift để lấy ca
        {
            $lookup: {
                from: 'shifts',
                localField: 'shift',
                foreignField: '_id',
                as: 'shift',
            },
        },
        { $unwind: { path: '$shift', preserveNullAndEmptyArrays: true } },
        // Chuẩn hóa dữ liệu
        {
            $addFields: {
                dateStr: {
                    $dateToString: { format: '%Y-%m-%d', date: '$workingDate' },
                },
                shiftNum: { $toInt: '$shift.name' },
                productionValue: {
                    $ifNull: [{
                        $getField: {
                            field: production, // ⚡ tên trường động, ví dụ "totalProduction"
                            input: "$reports",
                        },
                    }, 0]
                },
            },
        },
        {
            $facet: {
                // ---- A. Tính tổng theo ngày và ca ----
                byDate: [
                    {
                        $group: {
                            _id: { date: '$dateStr', shift: '$shiftNum' },
                            totalProduction: { $sum: '$productionValue' }
                        }
                    },
                    {
                        $group: {
                            _id: '$_id.date',
                            shifts: {
                                $push: { shift: '$_id.shift', production: '$totalProduction' }
                            },
                            dayTotal: { $sum: '$totalProduction' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],

                // ---- B. Tính tổng theo máy trong ngày được chọn ----
                byDevice: [
                    { $match: { dateStr: selectedKey } },
                    {
                        $lookup: {
                            from: 'devices',
                            localField: 'reports.device',
                            foreignField: '_id',
                            as: 'device',
                            pipeline: [{ $project: { code: 1 } }]
                        }
                    },
                    { $unwind: { path: '$device', preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: '$device._id',
                            // Mã thiết bị theo bản chụp lúc lệnh hoàn thành (nếu chuyến đã chốt và vẫn là xe đó)
                            code: {
                                $first: {
                                    $cond: [
                                        { $eq: ['$reports.frozen.data.device._id', '$reports.device'] },
                                        '$reports.frozen.data.device.code',
                                        '$device.code'
                                    ]
                                }
                            },
                            totalProduction: { $sum: '$productionValue' }
                        }
                    },
                    { $sort: { code: 1 } }
                ]
            }
        }
    ]);

    const { byDate, byDevice } = result[0] || { byDate: [], byDevice: [] };

    const productionByDay = byDate.map((r) => ({
        date: r._id,
        shifts: r.shifts.filter((s) => !!s.shift),
        dayTotal: r.dayTotal,
    }));

    const cumulativeTotal = productionByDay.reduce((sum, d) => sum + d.dayTotal, 0);

    const selectedDay =
        productionByDay.find((d) => d.date === selectedKey) || {
            date: selectedKey,
            shifts: [
                { shift: 1, production: 0 },
                { shift: 2, production: 0 },
                { shift: 3, production: 0 },
            ],
            dayTotal: 0,
        };

    return {
        jobType: metricType,
        productionByDay,
        cumulativeTotal,
        selectedDay,
        deviceProductions: byDevice.map(d => ({
            deviceId: d._id,
            code: d.code || 'N/A',
            totalProduction: d.totalProduction
        }))
    };
}



// ------------------
// ROUTE /vhx (Vận hành Xúc) - TỐI ƯU HÓA
// ------------------
router.get(
    '/vhx',
    verifyToken,
    restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
    async (req, res) => {
        try {
            const { date, department } = req.query;
            const user = req.user;

            if (!date) {
                return res.status(400).json({ status: 'error', message: 'Thiếu tham số date' });
            }

            const selected = new Date(date);
            const selectedDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999);
            const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 0, 0, 0, 0);

            const departmentId =
                user?.role === ROLE.MANAGER
                    ? user?.department?._id
                    : [ROLE.ADMIN, ROLE.DISPATCHER].includes(user?.role)
                        ? department
                        : null;

            // 🚀 GỌI HÀM AGGREGATION MỚI
            const kldSummaries = await summariseVehicleOrdersAggFull(
                JOB_TYPE.VAN_HANH_XUC, // Loại Job
                selectedDate,
                startOfMonth,
                departmentId,
                "totalCubicMeter",
                "KLD"
            );
            const tltSummaries = await summariseVehicleOrdersAggFull(
                JOB_TYPE.VAN_HANH_XUC, // Loại Job
                selectedDate,
                startOfMonth,
                departmentId,
                "totalTon",
                "TLT"
            );

            res.status(200).json({
                status: 'success',
                message: 'Tính sản lượng tổng hợp thành công',
                data: [kldSummaries, tltSummaries], // Trả về cả KLD và TLT
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 'error', message: err.message });
        }
    }
);

// ------------------
// ROUTE /tkm (Vận hành Xe) - TỐI ƯU HÓA
// ------------------
router.get(
    '/tkm',
    verifyToken,
    restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
    async (req, res) => {
        try {
            const { date, department } = req.query;
            const user = req.user;

            if (!date) {
                return res.status(400).json({ status: 'error', message: 'Thiếu tham số date' });
            }

            const selected = new Date(date);
            const selectedDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999);
            const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 0, 0, 0, 0);

            const departmentId =
                user?.role === ROLE.MANAGER
                    ? user?.department?._id
                    : [ROLE.ADMIN, ROLE.DISPATCHER].includes(user?.role)
                        ? department
                        : null;

            // 🚀 GỌI HÀM AGGREGATION MỚI
            const summaries = await summariseVehicleOrdersAggFull(
                JOB_TYPE.VAN_HANH_XE, // Loại Job
                selectedDate,
                startOfMonth,
                departmentId,
                "totalProduction",
                "SLD"
            );

            res.status(200).json({
                status: 'success',
                message: 'Tính sản lượng tổng hợp thành công',
                data: [summaries], // Trả về SLD
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 'error', message: err.message });
        }
    }
);
router.get(
    '/vhk',
    verifyToken,
    restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER),
    async (req, res) => {
        try {
            const { date, department } = req.query;
            const user = req.user;

            if (!date) {
                return res.status(400).json({ status: 'error', message: 'Thiếu tham số date' });
            }

            const selected = new Date(date);
            const selectedDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999);
            const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 0, 0, 0, 0);

            const departmentId =
                user?.role === ROLE.MANAGER
                    ? user?.department?._id
                    : [ROLE.ADMIN, ROLE.DISPATCHER].includes(user?.role)
                        ? department
                        : null;

            // 🚀 GỌI HÀM AGGREGATION MỚI
            const summaries = await summariseVehicleOrdersAggFull(
                JOB_TYPE.VAN_HANH_KHOAN, // Loại Job
                selectedDate,
                startOfMonth,
                departmentId,
                "totalProduction",
                "MKS"
            );

            res.status(200).json({
                status: 'success',
                message: 'Tính sản lượng tổng hợp thành công',
                data: [summaries], // Trả về SLD
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 'error', message: err.message });
        }
    }
);

router.get('/caculate', verifyToken, restrictTo(ROLE.MANAGER, ROLE.ADMIN, ROLE.DISPATCHER), async (req, res) => {
    try {
        const { date } = req.query
        const selected = new Date(date);
        // Các logic về ngày tháng giữ nguyên
        const selectedDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999);
        const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 0, 0, 0, 0);
        let query = { workingDate: { $gte: startOfMonth, $lte: selectedDate } };

        await runProductionUpdateBackground(req, query)
        res.status(200).json({ status: 'success', message: 'Cập nhật sản lượng thành công' })
    } catch (error) {
        req.logger.error("❌ Lỗi khi cập nhật sản lượng", error.stack);
        res.status(500).json({ status: 'error', message: error.message })
    }
})
module.exports = router;
