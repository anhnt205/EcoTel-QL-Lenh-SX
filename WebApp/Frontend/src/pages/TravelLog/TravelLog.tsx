import React from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";

import Lands from "./Tab/Land";
import Coals from "./Tab/Coal";

const TravelLogs: React.FC = () => {
  const [value, setValue] = React.useState<"Đất" | "Than" | "Nội bộ">("Đất");

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: "Đất" | "Than" | "Nội bộ",
  ) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h3" color="brand.title">
          Cung độ
        </Typography>
      </Box>
      <Box sx={{ width: "100%", typography: "body1" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="wrapped label tabs example"
        >
          <Tab
            value="Đất"
            label={<b style={{ fontSize: 17 }}>Cung độ vận chuyển đất</b>}
          />
          <Tab
            value="Than"
            label={
              <b style={{ fontSize: 17 }}>Cung độ vận chuyển than và SPNT</b>
            }
          />
          {/* <Tab value="Nội bộ" label={<b>Cung độ nội bộ</b>} /> */}
        </Tabs>
      </Box>
      {value === "Đất" && <Lands type={value} />}
      {value === "Than" && <Coals type={value} />}
      {/* {value === "Nội bộ" && <Internals type={value} />} */}
    </Box>
  );
};

export default TravelLogs;
