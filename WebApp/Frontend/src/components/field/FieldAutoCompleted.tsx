import {
  Autocomplete,
  TextField,
  createFilterOptions,
  Popper,
  PopperProps,
} from "@mui/material";
import { getIn, useField, useFormikContext } from "formik";
import { useCallback, useMemo } from "react";

interface Props {
  title: string;
  data: any[];
  labelkey: string;
  name?: string; // đổi từ field -> name
  disabled?: boolean;
  labelOption?: string;
  onChange?: (newValue: any) => void;
  onSearch?: (value: string) => void;
  componentsProps?: any;
  autocompleteSx?: any;
  limitOptions?: number;
  value?: any;
  setValue?: (val: any) => void;
  multiple?: boolean;
  noBorder?: boolean;
  fontSize?: string;
  anchorRight?: boolean;
  getOptionDisabled?: (option: any) => boolean;
  size?: "small" | "medium";
}

function CustomPopper(props: PopperProps & { anchorRight?: boolean }) {
  const { anchorRight, ...rest } = props;
  return (
    <Popper
      {...rest}
      style={{
        ...rest.style,
        width: "max-content",
        minWidth: rest.style?.width,
        maxWidth: "1000px",
      }}
      placement={anchorRight ? "bottom-end" : "bottom-start"}
    />
  );
}

export default function FieldAutoCompleted({
  title,
  data = [],
  labelkey,
  name,
  disabled,
  onChange,
  onSearch,
  labelOption,
  componentsProps,
  autocompleteSx,
  limitOptions = 10,
  value: valueProp,
  setValue: setValueProp,
  multiple,
  noBorder,
  fontSize,
  anchorRight,
  getOptionDisabled,
  size = "medium",
}: Props) {
  // Chế độ "name" (bên trong Formik): dùng useField để chỉ re-render đúng field này.
  // Chế độ "value/setValue" (độc lập, không cần Formik): dùng props như cũ.
  // Lưu ý: `name` phải ổn định qua các lần render của cùng 1 chỗ gọi (luôn có hoặc luôn không có),
  // không được đổi giữa có/không có giữa các lần render.
  const isFormikMode = Boolean(name);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [field, meta, helpers] = isFormikMode
    ? useField(name as string)
    : [undefined, undefined, undefined];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const formikCtx = isFormikMode ? useFormikContext<any>() : undefined;

  const currentValue = isFormikMode ? field!.value : valueProp;
  const touched = isFormikMode ? meta!.touched : false;
  const error = isFormikMode ? meta!.error : null;

  const filter = useMemo(() => {
    return limitOptions
      ? createFilterOptions<any>({ limit: limitOptions })
      : undefined;
  }, [limitOptions]);

  const selectedOption = useMemo(() => {
    if (multiple && Array.isArray(currentValue)) {
      const selectedItems = currentValue
        .map((item: any) =>
          data.find((datum) => datum._id?.toString() === item?.toString()),
        )
        .filter(Boolean);
      return selectedItems;
    }

    // 1. Tìm trong data trước (Logic gốc)
    const found = data.find(
      (i) => i._id?.toString() === currentValue?.toString(),
    );

    if (found) return found;

    // 2. Logic dự phòng: Nếu không thấy trong data nhưng có currentValue và đang ở formik mode
    if (currentValue && isFormikMode && name && formikCtx) {
      const parentPath = name.includes(".")
        ? name.substring(0, name.lastIndexOf("."))
        : "";

      const labelPath = parentPath ? `${parentPath}.${labelkey}` : "";
      const labelValue = labelPath ? getIn(formikCtx.values, labelPath) : null;

      if (labelValue) {
        return { id: currentValue, [labelkey]: labelValue };
      }
    }

    return multiple ? [] : null;
    // Thêm data vào dependency để khi listAssets từ API về, nó sẽ tính toán lại và khớp với hàng thật
  }, [
    currentValue,
    data,
    isFormikMode,
    formikCtx?.values,
    name,
    labelkey,
    multiple,
  ]);

  const PopperComponent = useCallback(
    (props: PopperProps) => (
      <CustomPopper {...props} anchorRight={anchorRight} />
    ),
    [anchorRight],
  );

  return (
    <Autocomplete
      sx={autocompleteSx}
      componentsProps={{
        ...componentsProps,
        paper: {
          ...componentsProps?.paper,
          sx: {
            ...(componentsProps?.paper?.sx || {}),
          },
        },
      }}
      PopperComponent={PopperComponent}
      disabled={disabled}
      fullWidth
      options={data}
      getOptionDisabled={getOptionDisabled}
      {...(filter ? { filterOptions: filter } : {})}
      getOptionLabel={(option: any) => {
        if (!option) return "";
        if (typeof option === "string") return option;

        return `${(labelOption && `${option[labelOption]} -`) || ""} ${option[labelkey] || ""}`.trim();
      }}
      isOptionEqualToValue={(option, value) => {
        if (!value) return false;
        return option?._id?.toString() === (value?._id || value)?.toString();
      }}
      value={selectedOption}
      multiple={multiple}
      onChange={(e, newValue) => {
        if (isFormikMode && helpers) {
          if (multiple) {
            helpers.setValue(
              Array.isArray(newValue)
                ? newValue.map((item: any) => item?._id)
                : [],
            );
          } else {
            helpers.setValue((newValue as any)?._id);
          }
          helpers.setError(undefined);
        }
        if (onChange) {
          onChange(newValue);
        }
        if (setValueProp) {
          if (multiple) {
            setValueProp(
              Array.isArray(newValue)
                ? newValue.map((item: any) => item?._id)
                : [],
            );
          } else {
            setValueProp((newValue as any)?._id || "");
          }
        }
      }}
      onInputChange={(_, value) => onSearch?.(value)}
      renderOption={(props, option, state) => {
        const label = `${
          labelOption ? `${option[labelOption]} -` : ""
        } ${option[labelkey] || ""}`;

        return (
          <li
            {...props}
            key={`${option._id} - ${state.index}`}
            title={label}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
              display: "block",
            }}
          >
            {label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={title}
          error={Boolean(touched && error)}
          helperText={touched ? error : ""}
          onBlur={() => {
            if (isFormikMode && helpers) {
              helpers.setTouched(true, true);
            }
          }}
          size={size}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                border: noBorder ? "none" : undefined,
                borderBottom: noBorder
                  ? "1px solid rgba(0, 0, 0, 0.23)"
                  : undefined,
                borderRadius: noBorder ? 0 : undefined,
              },
              "&:hover fieldset": {
                borderBottom: noBorder
                  ? "1px solid rgba(0, 0, 0, 0.87)"
                  : undefined,
              },
              "&.Mui-focused fieldset": {
                borderBottom: noBorder ? "2px solid #1976d2" : undefined,
              },
            },
            "& .MuiInputBase-input": {
              fontSize: fontSize || "inherit",
            },
          }}
        />
      )}
    />
  );
}
