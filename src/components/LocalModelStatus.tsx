import { Box, Typography, Chip, Tooltip, Paper, useTheme } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BoltIcon from '@mui/icons-material/Bolt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

interface LocalModelStatusProps {
  tinyBertLatency?: number; // 毫秒
  llmLatency?: number; // 毫秒
}

const LocalModelStatus: React.FC<LocalModelStatusProps> = ({ 
  tinyBertLatency = 12, 
  llmLatency = 950 
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 显示风格
  const bgColor = isDarkMode ? '#1A2027' : '#f5f9ff';
  const textColor = isDarkMode ? '#e0e0e0' : '#333333';
  const tinyBertColor = isDarkMode ? '#81d4fa' : '#0288d1';
  const llmColor = isDarkMode ? '#b39ddb' : '#5e35b1';
  
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
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
        {/* TinyBERT 模型 */}
        <Tooltip title="本地运行的轻量级Transformer模型，针对HDL代码错误检测进行优化" arrow>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: isDarkMode ? 'rgba(2, 136, 209, 0.15)' : 'rgba(2, 136, 209, 0.08)',
            borderRadius: 1,
            px: 1,
            py: 0.25,
            border: `1px solid ${isDarkMode ? 'rgba(2, 136, 209, 0.3)' : 'rgba(2, 136, 209, 0.2)'}`,
          }}>
            <BoltIcon sx={{ color: tinyBertColor, fontSize: 14, mr: 0.5 }} />
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold', 
              color: tinyBertColor,
              fontSize: '0.7rem',
              fontFamily: 'Consolas, monospace',
              mr: 0.5
            }}>
              TinyBERT-HDL
            </Typography>
            <Chip 
              size="small" 
              icon={<SpeedIcon sx={{ fontSize: '0.6rem !important' }} />}
              label={`${tinyBertLatency}ms`}
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
                color: tinyBertColor,
                border: `1px solid ${isDarkMode ? 'rgba(2, 136, 209, 0.4)' : 'rgba(2, 136, 209, 0.3)'}`,
              }}
            />
          </Box>
        </Tooltip>
        
        {/* 7B LLM模型 */}
        <Tooltip title="本地运行的7B参数大语言模型，针对HDL领域定制微调" arrow>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.15)' : 'rgba(94, 53, 177, 0.08)',
            borderRadius: 1,
            px: 1,
            py: 0.25,
            border: `1px solid ${isDarkMode ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'}`,
          }}>
            <PsychologyIcon sx={{ color: llmColor, fontSize: 14, mr: 0.5 }} />
            <Typography variant="caption" sx={{ 
              fontWeight: 'bold', 
              color: llmColor,
              fontSize: '0.7rem',
              fontFamily: 'Consolas, monospace',
              mr: 0.5
            }}>
              HDL-LLM-7B
            </Typography>
            <Chip 
              size="small" 
              icon={<AutoFixHighIcon sx={{ fontSize: '0.6rem !important' }} />}
              label={`${llmLatency}ms`}
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
                color: llmColor,
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
          执行于: <span style={{ fontWeight: 'bold' }}>Intel Core Ultra NPU</span>
        </Typography>
      </Box>
    </Paper>
  );
};

export default LocalModelStatus; 