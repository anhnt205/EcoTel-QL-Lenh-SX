import { Box, Card, Typography } from '@mui/material';
import React from 'react'
import { useNavigate } from 'react-router-dom';

export default function SummaryCard(
    {
        title,
        value,
        icon,
        color,
        type
    }: {
        title: string;
        value: number;
        icon: React.ReactNode;
        color: string;
        type: string;
    }
) {
    const navigate = useNavigate();
    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                border: '1px solid #e5e9f0',
                boxShadow: 'none',
            }}
        >
            <Box
                sx={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    bgcolor: color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                }}
            >
                {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20 } })}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', '&:hover': { color: 'brand.strong' } }}
                    onClick={() => { navigate(`${type === "department" ? '/departments' : '/users'}`) }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                    {value}
                </Typography>
            </Box>
        </Card>
    )
}
