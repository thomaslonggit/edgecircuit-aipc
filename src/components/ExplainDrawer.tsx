import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Divider, 
  Button,
  Paper,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PsychologyIcon from '@mui/icons-material/Psychology';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { NodeExplanation } from '../utils/types';
import Editor from '@monaco-editor/react';

interface ExplainDrawerProps {
  open: boolean;
  onClose: () => void;
  explanation: NodeExplanation | null;
  onApplyFix: (fixedCode: string) => void;
}

const ExplainDrawer: React.FC<ExplainDrawerProps> = ({ 
  open, 
  onClose, 
  explanation,
  onApplyFix
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Handle applying the fix
  const handleApplyFix = () => {
    if (explanation) {
      onApplyFix(explanation.fixedCode);
      onClose();
    }
  };
  
  // LLM模型信息
  const llmColor = isDarkMode ? '#b39ddb' : '#5e35b1';
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 500 },
          p: 2,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PsychologyIcon sx={{ mr: 1, color: llmColor }} />
          <Typography variant="h6" sx={{ fontFamily: 'Consolas, monospace' }}>
            详细分析与修复
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* LLM模型信息 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        pb: 1,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Tooltip title="本地运行的7B参数大语言模型，针对HDL领域定制微调" arrow>
          <Chip 
            icon={<MemoryIcon />}
            label="HDL-LLM-7B"
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.15)' : 'rgba(94, 53, 177, 0.08)',
              color: llmColor,
              border: `1px solid ${isDarkMode ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'}`,
              fontFamily: 'Consolas, monospace',
              mr: 1
            }}
          />
        </Tooltip>
        <Tooltip title="在Intel Core Ultra NPU上运行" arrow>
          <Chip 
            icon={<SpeedIcon />}
            label="950ms"
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.15)' : 'rgba(94, 53, 177, 0.08)',
              color: llmColor,
              border: `1px solid ${isDarkMode ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'}`,
              fontFamily: 'Consolas, monospace',
              mr: 1
            }}
          />
        </Tooltip>
        <Typography variant="caption" sx={{ 
          color: theme.palette.text.secondary, 
          ml: 'auto',
          fontFamily: 'Consolas, monospace'
        }}>
          本地NPU加速分析
        </Typography>
      </Box>
      
      {explanation ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 84px)' }}>
          {/* Problem explanation */}
          <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mb: 2,
              bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.07)' : 'rgba(94, 53, 177, 0.03)',
              borderColor: isDarkMode ? 'rgba(94, 53, 177, 0.2)' : 'rgba(94, 53, 177, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 'bold',
                  color: llmColor
                }}
              >
                问题分析
              </Typography>
              <Chip 
                size="small" 
                icon={<ThumbUpIcon fontSize="small" />}
                label="99.8% 准确率"
                sx={{ 
                  ml: 'auto',
                  height: 20, 
                  '& .MuiChip-label': { 
                    px: 0.5, 
                    fontSize: '0.65rem',
                    fontFamily: 'Consolas, monospace'
                  },
                  '& .MuiChip-icon': { 
                    fontSize: '0.7rem',
                    ml: 0.5
                  },
                  bgcolor: isDarkMode ? 'rgba(94, 53, 177, 0.15)' : 'rgba(94, 53, 177, 0.08)',
                  color: llmColor,
                  border: `1px solid ${isDarkMode ? 'rgba(94, 53, 177, 0.3)' : 'rgba(94, 53, 177, 0.2)'}`,
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ 
              lineHeight: 1.6,
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
            }}>
              {explanation.explanation}
            </Typography>
          </Paper>
          
          {/* Fix description */}
          <Typography 
            variant="subtitle1" 
            sx={{ 
              mb: 1,
              fontWeight: 'bold',
              color: llmColor
            }}
          >
            {explanation.fixDescription}
          </Typography>
          
          {/* Code display */}
          <Box sx={{ mb: 2, flexGrow: 1, minHeight: 200, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" sx={{ mb: 1, color: theme.palette.text.secondary }}>
              原始代码:
            </Typography>
            <Paper variant="outlined" sx={{ mb: 2, height: '40%' }}>
              <Editor
                height="100%"
                language="verilog"
                value={explanation.originalCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  automaticLayout: true,
                }}
                theme={isDarkMode ? "vs-dark" : "light"}
              />
            </Paper>
            
            <Typography variant="caption" sx={{ mb: 1, color: theme.palette.text.secondary }}>
              修复后的代码:
            </Typography>
            <Paper variant="outlined" sx={{ height: '60%' }}>
              <Editor
                height="100%"
                language="verilog"
                value={explanation.fixedCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  automaticLayout: true,
                }}
                theme={isDarkMode ? "vs-dark" : "light"}
              />
            </Paper>
          </Box>
          
          {/* Action buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="outlined" 
              color="inherit" 
              onClick={onClose}
              sx={{ mr: 1 }}
            >
              取消
            </Button>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: llmColor,
                '&:hover': {
                  bgcolor: isDarkMode ? '#9575cd' : '#4527a0',
                }
              }} 
              onClick={handleApplyFix}
            >
              应用修复
            </Button>
          </Box>
        </Box>
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: 'calc(100% - 84px)',
          }}
        >
          <PsychologyIcon sx={{ 
            fontSize: 60, 
            mb: 2, 
            color: llmColor,
            opacity: 0.4 
          }} />
          <Typography variant="body1" color="text.secondary">
            选择一个问题以获取详细分析
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            由本地HDL-LLM-7B模型提供深度修复分析
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default ExplainDrawer; 