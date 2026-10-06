import React from "react";
import {
    Box,
    Typography,
    Breadcrumbs,
    Tabs,
    Tab,
} from "@mui/material";
import MaterialType from "./Tab/MaterialType";
import MaterialDensity from "./Tab/MaterialDensity";

const Materials: React.FC = () => {

    const [tab, setTab] = React.useState<'material'|'density'>('material');

    const handleChange = (event: React.SyntheticEvent, newValue: 'material' | 'density') => {
        setTab(newValue);
    };

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb">
                <Typography>Danh mục</Typography>
                <Typography>Vật liệu</Typography>
            </Breadcrumbs>
            <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
            >
                <Typography variant="h3" color="brand.title">
                    Vật liệu
                </Typography>
            </Box>
            <Box sx={{ width: '100%', typography: 'body1' }}>
                <Tabs
                    value={tab}
                    onChange={handleChange}
                    aria-label="wrapped label tabs example"
                >
                    <Tab value="material" label={<b style={{ fontSize: 17 }}>Loại vật liệu</b>} />
                    <Tab value="density" label={<b style={{ fontSize: 17 }}>Tỷ trọng vật liệu</b>} />
                </Tabs>
            </Box>
            {tab === "material" && <MaterialType />}
            {tab === "density" && <MaterialDensity/>}
            
        </Box>
    );
};

export default Materials;