import { Box, Typography, Chip, Tooltip, Paper, useTheme, keyframes } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import BoltIcon from '@mui/icons-material/Bolt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';

// 定义旋转动画
const rotateAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// 定义脉冲动画
const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

interface LocalModelStatusProps {
  tinyBertLatency?: number; // 毫秒
  llmLatency?: number; // 毫秒
  tinyBertConnected?: boolean; // 连接状态
  llmConnected?: boolean; // 连接状态
  tinyBertError?: string; // 错误信息
  llmError?: string; // 错误信息
  tinyBertWorking?: boolean; // TinyBERT是否正在工作
}

const LocalModelStatus: React.FC<LocalModelStatusProps> = ({ 
  tinyBertLatency = 0, 
  llmLatency = 0,
  tinyBertConnected = false,
  llmConnected = false,
  tinyBertError,
  llmError,
  tinyBertWorking = false
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 显示风格
  const bgColor = isDarkMode ? '#1A2027' : '#f5f9ff';
  const textColor = isDarkMode ? '#e0e0e0' : '#333333';
  const tinyBertColor = isDarkMode ? '#81d4fa' : '#0288d1';
  const llmColor = isDarkMode ? '#b39ddb' : '#5e35b1';
  
  // 根据连接状态确定颜色
  const getTinyBertStatusColor = () => {
    if (tinyBertError) return '#f44336'; // 红色表示错误
    if (tinyBertConnected) return tinyBertColor; // 正常颜色表示连接
    return '#9e9e9e'; // 灰色表示未连接
  };
  
  const getLLMStatusColor = () => {
    if (llmError) return '#f44336'; // 红色表示错误
    if (llmConnected) return llmColor; // 正常颜色表示连接
    return '#9e9e9e'; // 灰色表示未连接
  };
  
  // 获取状态图标
  const getTinyBertStatusIcon = () => {
    if (tinyBertWorking) {
      return (
        <SyncIcon 
          sx={{ 
            fontSize: 14,
            animation: `${rotateAnimation} 1s linear infinite`,
            color: tinyBertColor
          }} 
        />
      );
    }
    if (tinyBertError) return <ErrorIcon sx={{ fontSize: 14 }} />;
    if (tinyBertConnected) return <CheckCircleIcon sx={{ fontSize: 14 }} />;
    return <WifiOffIcon sx={{ fontSize: 14 }} />;
  };
  
  const getLLMStatusIcon = () => {
    if (llmError) return <ErrorIcon sx={{ fontSize: 14 }} />;
    if (llmConnected) return <CheckCircleIcon sx={{ fontSize: 14 }} />;
    return <WifiOffIcon sx={{ fontSize: 14 }} />;
  };
  
  // 获取状态文本
  const getTinyBertStatusText = () => {
    if (tinyBertWorking) return '正在分析代码...';
    if (tinyBertError) return `错误: ${tinyBertError.slice(0, 30)}...`;
    if (tinyBertConnected) return '已连接';
    return '未连接';
  };
  
  const getLLMStatusText = () => {
    if (llmError) return `错误: ${llmError.slice(0, 30)}...`;
    if (llmConnected) return '已连接';
    return '未连接';
  };
  
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
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mr: 1
      }}>
        <MemoryIcon sx={{ fontSize: 16, mr: 0.5, color: textColor }} />
        <Typography variant="caption" sx={{ 
          fontWeight: 'bold', 
          color: textColor,
          fontFamily: 'Consolas, monospace',
          fontSize: '0.75rem'
        }}>
          本地AI模型状态
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* TinyBERT状态 */}
        <Tooltip 
          title={`TinyBERT语法检查模型 - ${getTinyBertStatusText()} - 延迟: ${tinyBertLatency}ms`} 
          arrow
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: tinyBertWorking 
              ? (isDarkMode ? 'rgba(2, 136, 209, 0.25)' : 'rgba(2, 136, 209, 0.15)')
              : (isDarkMode ? 'rgba(2, 136, 209, 0.15)' : 'rgba(2, 136, 209, 0.08)'),
            borderRadius: 1,
            px: 1,
            py: 0.25,
            border: `1px solid ${isDarkMode ? 'rgba(2, 136, 209, 0.3)' : 'rgba(2, 136, 209, 0.2)'}`,
            animation: tinyBertWorking ? `${pulseAnimation} 2s ease-in-out infinite` : 'none',
          }}>
            {getTinyBertStatusIcon()}
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold', 
              color: getTinyBertStatusColor(),
              fontSize: '0.7rem',
              fontFamily: 'Consolas, monospace',
              mr: 0.5,
              ml: 0.3
            }}>
              TinyBERT
            </Typography>
            <Chip 
              size="small" 
              icon={<BoltIcon sx={{ fontSize: '0.6rem !important' }} />}
              label={tinyBertWorking ? '工作中' : (tinyBertConnected ? `${tinyBertLatency}ms` : 'N/A')}
              sx={{ 
                height: 16, 
                '& .MuiChip-label': { 
                  px: 0.5, 
                  fontSize: '0.6rem',
                  fontFamily: 'Consolas, monospace'
                },
                '& .MuiChip-icon': { 
                  fontSize: '0.6rem',
                  ml: 0.5
                },
                bgcolor: isDarkMode ? 'rgba(2, 136, 209, 0.25)' : 'rgba(2, 136, 209, 0.15)',
                color: getTinyBertStatusColor(),
                border: `1px solid ${isDarkMode ? 'rgba(2, 136, 209, 0.4)' : 'rgba(2, 136, 209, 0.3)'}`,
              }}
            />
          </Box>
        </Tooltip>

        {/* LLM状态 */}
        <Tooltip 
          title={`本地运行的7B参数大语言模型 - ${getLLMStatusText()} - 延迟: ${llmLatency}ms`} 
          arrow
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.15)' : 'rgba(94, 53, 177, 0.08)',
            borderRadius: 1,
            px: 1,
            py: 0.25,
            border: `1px solid ${isDarkMode ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'}`,
          }}>
            {getLLMStatusIcon()}
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold', 
              color: getLLMStatusColor(),
              fontSize: '0.7rem',
              fontFamily: 'Consolas, monospace',
              mr: 0.5,
              ml: 0.3
            }}>
              HDL-LLM-7B
            </Typography>
            <Chip 
              size="small" 
              icon={<AutoFixHighIcon sx={{ fontSize: '0.6rem !important' }} />}
              label={llmConnected ? `${llmLatency}ms` : 'N/A'}
              sx={{ 
                height: 16, 
                '& .MuiChip-label': { 
                  px: 0.5, 
                  fontSize: '0.6rem',
                  fontFamily: 'Consolas, monospace'
                },
                '& .MuiChip-icon': { 
                  fontSize: '0.6rem',
                  ml: 0.5
                },
                bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.25)' : 'rgba(94, 53, 177, 0.15)',
                color: getLLMStatusColor(),
                border: `1px solid ${isDarkMode ? 'rgba(94, 53, 177, 0.4)' : 'rgba(94, 53, 177, 0.3)'}`,
              }}
            />
          </Box>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ 
          color: textColor, 
          fontFamily: 'Consolas, monospace',
          fontSize: '0.65rem'
        }}>
          执行于: <span style={{ fontWeight: 'bold' }}>Intel GPU/NPU</span>
          {(tinyBertConnected || llmConnected) && 
            <span style={{ color: '#2ecc71', marginLeft: '8px' }}>● 在线</span>
          }
          {(!tinyBertConnected && !llmConnected) && 
            <span style={{ color: '#e74c3c', marginLeft: '8px' }}>● 离线</span>
          }
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocalModelStatus; 