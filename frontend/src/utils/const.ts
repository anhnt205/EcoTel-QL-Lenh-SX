import { AcceptedProductEnum, DeviceTypeEnum, JobTypeEnum, RoleEnum, StatusDeviceEnum, StatusOrderEnum, StatusRepairEnum } from "../enums";

export const JOB_TYPE_OPTIONS = Object.values(JobTypeEnum).map((value) => ({
    label: value,
    value,
}));
export const STATUS_DEVICE_OPTIONS = Object.values(StatusDeviceEnum).map((value) => ({
    label: value,
    value: value === StatusDeviceEnum.AVAILABLE ? "Chờ điều động" : value === StatusDeviceEnum.IN_USE ? "Đang hoạt động" : value === StatusDeviceEnum.MAINTENANCE ? "SC; BD" : "Niêm cất",
}));
export const STATUS_ORDER_OPTIONS = Object.values(StatusOrderEnum).map((value) => ({
    label: value,
    value: value === StatusOrderEnum.PENDING ? "Chưa nhận lệnh" : value === StatusOrderEnum.INPROGRESS ? "Đã nhận lệnh" : value === StatusOrderEnum.COMPLETED ? "Đã hoàn thành" : value === StatusOrderEnum.WARNING ? "Lỗi" : "Đã hủy",
}));
export const ROLE_TYPE_OPTIONS = Object.values(RoleEnum).map((value) => ({
    label: value,
    value: value === RoleEnum.ADMIN ? "Quản trị hệ thống" : value === RoleEnum.DISPATCHER ? "Điều hành sản xuất" : value === RoleEnum.MANAGER ? "Quản lý" : "Nhân viên",
}));
export const STATUS_REPAIR_OPTIONS = Object.values(StatusRepairEnum).map((value) => ({
    label: value,
    value,
}));
export const ACCEPTED_PRODUCT_OPTIONS = Object.values(AcceptedProductEnum).map((value) => ({
    label: value,
    value,
}));
export const DEVICE_TYPE_OPTIONS = Object.values(DeviceTypeEnum).map((value) => ({
    label: value,
    value,
}));