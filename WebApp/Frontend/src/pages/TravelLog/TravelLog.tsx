import React from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";

import TravelLogTab from "./components/TravelLogTab";
import { AcceptedProductEnum } from "../../enums";

const TravelLogs: React.FC = () => {
  const [value, setValue] = React.useState<AcceptedProductEnum>(
    AcceptedProductEnum.LAND,
  );

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: AcceptedProductEnum,
  ) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h3" color={"blue"}>
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
            value={AcceptedProductEnum.COAL}
            label={<b style={{ fontSize: 17 }}>Cung độ vận chuyển đất</b>}
          />
          <Tab
            value={AcceptedProductEnum.LAND}
            label={
              <b style={{ fontSize: 17 }}>Cung độ vận chuyển than và SPNT</b>
            }
          />
          {/* <Tab value="Nội bộ" label={<b>Cung độ nội bộ</b>} /> */}
        </Tabs>
      </Box>
      {value === "Đất" && <TravelLogTab type={value} />}
      {value === "Than" && <TravelLogTab type={value} />}
      {/* {value === "Nội bộ" && <Internals type={value} />} */}
    </Box>
  );
};

export default TravelLogs;
