import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Typography } from "@mui/material";

const RealTimeClock: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [time, setTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Typography
      variant={compact ? "body2" : "h5"}
      sx={{
        fontVariantNumeric: "tabular-nums",
        minWidth: compact ? 0 : 200,
        ...(compact && { fontWeight: 700, whiteSpace: "nowrap", color: "#334155" }),
      }}
    >
      {time.format("DD/MM/YYYY HH:mm:ss")}
    </Typography>
  );
};

export default RealTimeClock;
