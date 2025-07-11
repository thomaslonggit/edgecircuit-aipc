import { Box, Typography, Tooltip, Paper, useTheme } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import MemoryIcon from '@mui/icons-material/Memory';
import DevicesIcon from '@mui/icons-material/Devices';
import SpeedIcon from '@mui/icons-material/Speed';
import SyncIcon from '@mui/icons-material/Sync';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';

const IntelArchBanner: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Intel品牌蓝色
  const intelBlue = '#0071c5';
  const clientColor = isDarkMode ? '#7fbfff' : '#0071c5';
  const cloudColor = isDarkMode ? '#a0d0ff' : '#00b2e3';
  const bgColor = isDarkMode ? '#1A2027' : '#f0f8ff';
  const textColor = isDarkMode ? '#e0e0e0' : '#333333';
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        display: 'flex',
        flexDirection: 'row',
        bgcolor: bgColor,
        py: 0.5,
        px: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box component="img" 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Intel_logo_%282006-2020%29.svg/200px-Intel_logo_%282006-2020%29.svg.png" 
          sx={{ height: 16, mr: 0.5 }}
          alt="Intel Logo"
        />
        <Typography variant="caption" sx={{ 
          fontWeight: 'bold', 
          color: textColor,
          fontFamily: 'Consolas, monospace',
          fontSize: '0.75rem',
          mr: 2
        }}>
          本地AIPC硬件加速方案
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        {/* 客户端部分 */}
        <Tooltip title="Intel AI PC - 搭载Intel Core Ultra处理器和集成NPU" arrow>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: isDarkMode ? 'rgba(0, 113, 197, 0.15)' : 'rgba(0, 113, 197, 0.08)',
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            border: `1px solid ${isDarkMode ? 'rgba(0, 113, 197, 0.3)' : 'rgba(0, 113, 197, 0.2)'}`,
          }}>
            <ComputerIcon sx={{ color: clientColor, fontSize: 14, mr: 0.3 }} />
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold', 
              color: clientColor,
              fontSize: '0.65rem',
              mr: 0.3,
              fontFamily: 'Consolas, monospace'
            }}>
              客户端
            </Typography>
            <Tooltip title="Intel Core Ultra处理器" arrow>
              <MemoryIcon sx={{ color: clientColor, fontSize: 14, mx: 0.1 }} />
            </Tooltip>
            <Tooltip title="集成神经网络处理器(NPU)" arrow>
              <DevicesIcon sx={{ color: clientColor, fontSize: 14, mx: 0.1 }} />
            </Tooltip>
          </Box>
        </Tooltip>
        
        {/* 连接箭头 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mx: 0.75 }}>
          <ArrowRightIcon sx={{ color: isDarkMode ? '#7fbfff' : intelBlue, fontSize: 14 }} />
          <SyncIcon sx={{ color: isDarkMode ? '#7fbfff' : intelBlue, fontSize: 12, mx: 0.3 }} />
          <ArrowLeftIcon sx={{ color: isDarkMode ? '#7fbfff' : intelBlue, fontSize: 14 }} />
        </Box>
        
        {/* 本地AIPC部分 */}
        <Tooltip title="Intel GPU/NPU加速器 - 本地自动调度高性能AI推理与计算" arrow>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: isDarkMode ? 'rgba(0, 178, 227, 0.15)' : 'rgba(0, 178, 227, 0.08)',
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            border: `1px solid ${isDarkMode ? 'rgba(0, 178, 227, 0.3)' : 'rgba(0, 178, 227, 0.2)'}`,
          }}>
            <MemoryIcon sx={{ color: cloudColor, fontSize: 14, mr: 0.3 }} />
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold', 
              color: cloudColor,
              fontSize: '0.65rem',
              mr: 0.3,
              fontFamily: 'Consolas, monospace'
            }}>
              本地AIPC
            </Typography>
            <Tooltip title="Intel GPU/NPU自动调度" arrow>
              <SpeedIcon sx={{ color: cloudColor, fontSize: 14, mx: 0.1 }} />
            </Tooltip>
          </Box>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ 
          color: textColor, 
          fontFamily: 'Consolas, monospace',
          fontSize: '0.65rem'
        }}>
          加速比: <span style={{ fontWeight: 'bold', color: '#2ecc71' }}>8.6x</span> | 
          响应时间: <span style={{ fontWeight: 'bold', color: '#2ecc71' }}>45ms</span>
        </Typography>
      </Box>
    </Paper>
  );
};

export default IntelArchBanner; 