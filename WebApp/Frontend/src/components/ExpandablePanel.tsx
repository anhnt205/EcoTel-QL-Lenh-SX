import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import {
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';

export interface ExpandState {
    expanded: boolean;
    toggle: () => void;
    /**
     * Nút mở rộng / thu nhỏ, ghim ở góc trên-phải của thanh tiêu đề (position: absolute nên không bị
     * rớt dòng khi thanh tiêu đề hẹp). Thanh tiêu đề phải là phần tử có định vị (vd sticky) và chừa
     * padding-right ~44px (pr: 5.5) để bộ lọc không đè lên nút.
     */
    expandButton: ReactNode;
    /** Chiều cao cửa sổ (cập nhật khi đổi kích thước) để thẻ chỉnh biểu đồ khi đang mở rộng. */
    viewportHeight: number;
}

/**
 * Bọc 1 thẻ (Paper) để thẻ có thể mở rộng phủ kín màn hình.
 * Thẻ vẫn nằm nguyên trong cây React nên không bị remount: state, truy vấn và biểu đồ được giữ nguyên.
 * Dùng position: fixed (không dùng Fullscreen API) để popover/dropdown của MUI vẫn hiển thị phía trên.
 */
export default function ExpandablePanel({ children }: { children: (state: ExpandState) => ReactNode }) {
    const [expanded, setExpanded] = useState(false);
    const [placeholderHeight, setPlaceholderHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
    const ref = useRef<HTMLDivElement>(null);

    const toggle = useCallback(() => {
        // Đo trước khi rời luồng để ô lưới cũ giữ nguyên chiều cao, trang phía sau không bị giật.
        setPlaceholderHeight(ref.current?.offsetHeight ?? 0);
        setExpanded((v) => !v);
    }, []);

    useEffect(() => {
        if (!expanded) return;
        const onKeyDown = (e: KeyboardEvent) => {
            // Esc đã được dropdown/popover/lịch xử lý thì không thu nhỏ thẻ theo.
            if (e.key === 'Escape' && !e.defaultPrevented) setExpanded(false);
        };
        const onResize = () => setViewportHeight(window.innerHeight);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        onResize();
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onResize);
        };
    }, [expanded]);

    const expandButton = (
        <IconButton
            size="small"
            onClick={toggle}
            title={expanded ? 'Thu nhỏ (Esc)' : 'Mở rộng toàn màn hình'}
            aria-label={expanded ? 'Thu nhỏ' : 'Mở rộng toàn màn hình'}
            sx={{
                position: 'absolute',
                top: 5,
                right: 8,
                bgcolor: 'rgba(255,255,255,0.7)',
                '&:hover': { bgcolor: '#fff' },
            }}
        >
            {expanded ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
        </IconButton>
    );

    return (
        <>
            {expanded && <Box sx={{ height: placeholderHeight }} />}
            <Box
                ref={ref}
                sx={
                    expanded
                        ? {
                              position: 'fixed',
                              inset: 0,
                              // Trên thanh trên/menu bên (<=1200), dưới popover/dropdown/lịch (1300).
                              zIndex: 1250,
                              bgcolor: '#f3f5f9',
                              p: 1,
                              '& > .MuiPaper-root': {
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'auto',
                              },
                          }
                        : { minWidth: 0 }
                }
            >
                {children({ expanded, toggle, expandButton, viewportHeight })}
            </Box>
        </>
    );
}
