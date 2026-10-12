// utils/formikHelper.ts
export const getFormikFieldProps = (formik: any, path: string) => {
    // Tách đường dẫn ví dụ: "routes[0].location"
    const keys = path.split(/[.[\]]/).filter(Boolean);

    // Lấy lỗi
    let error: any = formik.errors;
    for (const key of keys) error = error?.[key];

    // Lấy touched
    let touched: any = formik.touched;
    for (const key of keys) touched = touched?.[key];

    const showError = Boolean(touched && error);

    return {
        error: showError,
        helperText: showError && typeof error === "string" ? error : "",
    };
};
