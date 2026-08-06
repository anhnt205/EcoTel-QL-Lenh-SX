import * as yup from 'yup';
import { JobTypeEnum, StatusDeviceEnum } from '../enums/index';

// cung do
export const trvelLogValidationSchema = yup.object({
    excavator: yup.string().required('Vui lòng chọn máy xúc'),
    workingDate: yup.string().required('Vui lòng chọn ngày'),
    shift: yup.string().required('Vui lòng chọn ca'),
    routes: yup.array().of(
        yup.object().shape({
            location: yup.string().required('Vui lòng chọn điểm đổ tải'),
            fullDistanceKm: yup.string().required('Vui lòng nhập cung độ'),
        })
    ),
});

// thong tin xe
export const vehicleValidationSchema = yup.object({
    code: yup.string().required('Vui lòng nhập biển số'),
    name: yup.string(),
    category: yup.string().required('Vui lòng chọn loại thiết bị'),
    coordinates: yup.object({
        lng: yup.number().required('Vui lòng chọn vĩ độ'),
        lat: yup.number().required('Vui lòng chọn kinh độ'),
    }).required('Vui lòng chọn tọa độ'),
    department: yup.string().required('Vui lòng chọn đơn vị'),
    status: yup.string().oneOf(Object.values(StatusDeviceEnum)).required('Vui lòng chọn trạng thái'),
});

// thong tin may
export const machineValidationSchema = yup.object({
    code: yup.string().required('Vui lòng nhập biển số'),
    name: yup.string(),
    coordinates: yup.object({
        lng: yup.number().required('Vui lòng chọn vĩ độ'),
        lat: yup.number().required('Vui lòng chọn kinh độ'),
    }).required('Vui lòng chọn tọa độ'),
    department: yup.string().required('Vui lòng chọn đơn vị'),
    category: yup.string().required('Vui lòng chọn loại máy'),
    status: yup.string().oneOf(Object.values(StatusDeviceEnum)).required('Vui lòng chọn trạng thái'),
});

// nguoi dung
export const userValidationSchema = yup.object({
    username: yup.string().required('Vui lòng nhập tên đăng nhập'),
    password: yup.string().when('_id', {
        is: (id: string) => !id,
        then: () => yup.string().required('Vui lòng nhập mật khẩu'),
        otherwise: () => yup.string(),
    }),
    fullName: yup.string().required('Vui lòng nhập họ tên'),
    salaryCode: yup.string().required('Vui lòng nhập mã thẻ lương'),
    position: yup.string().required('Vui lòng chọn chức vụ'),
    department: yup.string().required('Vui lòng chọn đơn vị'),
    role: yup.string().required('Vui lòng chọn quyền hạn'),
});

// ca
export const shiftValidationSchema = yup.object({
    name: yup.number().required('Vui lòng nhập ca làm việc'),
    startTime: yup.string().required('Vui lòng nhập thời gian bắt đầu'),
    endTime: yup.string().required('Vui lòng nhập thời gian kết thúc'),

});
export const deviceModelValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập chủng loại'),
});

// bien phap an toan
export const safetyMeasureValidationSchema = yup.object({
    name: yup.string().required('Tên biện pháp an toàn chung'),
    content: yup.string().required('Nhập nội dung'),
});

// chuc danh
export const positionValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập tên chức danh'),
    note: yup.string(),
});

// vat lieu
export const materialValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập tên vật liệu'),
});
// diem do tai
export const locationValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập tên điểm đổ tải'),
    coordinates: yup.object({
        lat: yup.number().required('Vui lòng chọn vĩ độ'),
        lng: yup.number().required('Vui lòng chọn kinh độ'),
    }).required('Vui lòng chọn tọa độ'),
    distance: yup.number().min(0, 'Khoảng cách phải lớn hơn hoặc bằng 0').required('Vui lòng nhập khoảng cách'),
});

// cong viec
export const jobValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập tên công việc'),
    type: yup
        .string()
        .oneOf(Object.values(JobTypeEnum))
        .required('Vui lòng chọn loại công việc'),
});
// loai phuong tien
export const deviceTypeValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập tên loại thiết bị'),
    group: yup.string().required('Vui lòng chọn nhóm thiết bị'),
});
// don vi
export const departmentValidationSchema = yup.object({
    name: yup.string().required('Vui lòng nhập tên đơn vị'),
    code: yup.string().required('Vui lòng nhập mã đơn vị'),
    description: yup.string(),
});

// lenh sx pdk
export const dispatcherOrderValidationSchema = yup.object({
  usersAndDepartments: yup.array().of(
    yup.object().shape({
      assignedTo: yup.string().required("Vui lòng chọn thẻ lương"),
      department: yup.string(),
    }),
  ),
  workingDate: yup.string().required("Vui lòng chọn ngày làm việc"),
  workContent: yup.string().required("Vui lòng nhập nội dung"),
  risk: yup.string().required("Vui lòng nhập dự báo nguy cơ"),
});

// them lenh sx
export const addOrderValidationSchema = yup.object({
    usersAndDevices: yup.array().of(
        yup.object().shape({
            assignedTo: yup.string().required('Vui lòng chọn thẻ lương'),
            device: yup.array(),
        })
    ),
    job: yup.string().required('Vui lòng chọn loại công việc'),
    workingDate: yup.string().required('Vui lòng chọn ngày làm việc'),
    shift: yup.string().required('Vui lòng chọn ca làm việc'),
    shiftHour: yup.string().required('Vui lòng nhập giờ làm việc'),
    workContent: yup.string().required('Vui lòng nhập nội dung'),
    risk: yup.string().required('Vui lòng nhập dự báo nguy cơ'),
});
// sưa, ban giao lenh sx
export const editAndTransferOrderValidationSchema = yup.object({
  assignedTo: yup.string().required("Vui lòng chọn thẻ lương"),
  device: yup.array(),
  job: yup.string().required("Vui lòng chọn loại công việc"),
  workingDate: yup.string().required("Vui lòng chọn ngày làm việc"),
  shift: yup.string().required("Vui lòng chọn ca làm việc"),
  shiftHour: yup.string().required("Vui lòng nhập giờ làm việc"),
  workContent: yup.string().required("Vui lòng nhập nội dung"),
  risk: yup.string().required("Vui lòng nhập dự báo nguy cơ"),
});