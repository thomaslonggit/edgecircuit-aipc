import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Chip,
  Divider,
  Button,
  Tooltip,
  IconButton,
  CircularProgress,
  useTheme
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BoltIcon from '@mui/icons-material/Bolt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useState } from 'react';
import { LintError } from '../utils/types';

interface ErrorListProps {
  errors: LintError[];
  onSelectLine: (lineNumber: number) => void;
  onRequestLLMAnalysis?: (errorCode: string, lineNumber: number) => void;
}

const ErrorList: React.FC<ErrorListProps> = ({ 
  errors, 
  onSelectLine,
  onRequestLLMAnalysis 
}) => {
  const theme = useTheme();
  const [loadingLLM, setLoadingLLM] = useState<string | null>(null);
  
  // Get counts of errors and warnings
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  
  // 模拟调用LLM分析
  const handleRequestLLMAnalysis = (errorCode: string, lineNumber: number) => {
    setLoadingLLM(errorCode);
    
    // 模拟LLM处理延迟
    setTimeout(() => {
      if (onRequestLLMAnalysis) {
        onRequestLLMAnalysis(errorCode, lineNumber);
      }
      setLoadingLLM(null);
    }, 800);
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.15)' : 'rgba(2, 136, 209, 0.04)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BoltIcon 
            fontSize="small" 
            sx={{ 
              mr: 0.5, 
              color: theme.palette.mode === 'dark' ? '#81d4fa' : '#0288d1'
            }} 
          />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Consolas, monospace' }}>
            实时问题检测
          </Typography>
          <Tooltip title="由TinyBERT-HDL提供毫秒级错误检测" arrow>
            <Chip 
              label="TinyBERT" 
              size="small" 
              sx={{ 
                ml: 1, 
                height: 20, 
                fontSize: '0.65rem',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.25)' : 'rgba(2, 136, 209, 0.15)',
                color: theme.palette.mode === 'dark' ? '#81d4fa' : '#0288d1',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.4)' : 'rgba(2, 136, 209, 0.3)'}`,
              }} 
            />
          </Tooltip>
        </Box>
        <Box>
          {errorCount > 0 && (
            <Chip 
              icon={<ErrorIcon fontSize="small" />} 
              label={`${errorCount} 错误`}
              size="small"
              color="error"
              sx={{ mr: 1 }}
            />
          )}
          {warningCount > 0 && (
            <Chip 
              icon={<WarningIcon fontSize="small" />} 
              label={`${warningCount} 警告`}
              size="small"
              color="warning"
            />
          )}
        </Box>
      </Box>
      
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {errors.length > 0 ? (
          errors.map((error, index) => (
            <Box key={`${error.line}-${index}`}>
              <ListItem 
                sx={{ 
                  py: 0.75,
                  px: 2,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  },
                  borderLeft: '3px solid',
                  borderLeftColor: error.severity === 'error' 
                    ? theme.palette.error.main 
                    : theme.palette.warning.main,
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}
              >
                {/* 错误概要行 */}
                <Box sx={{ 
                  display: 'flex', 
                  width: '100%', 
                  alignItems: 'flex-start',
                  mb: 0.5
                }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0 }}>
                    {error.severity === 'error' ? (
                      <ErrorIcon color="error" fontSize="small" />
                    ) : (
                      <WarningIcon color="warning" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'medium',
                          wordBreak: 'break-word'
                        }}>
                          {error.message}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Button 
                          size="small"
                          variant="outlined"
                          onClick={() => onSelectLine(error.line)}
                          sx={{ 
                            mr: 1, 
                            minWidth: 0, 
                            py: 0,
                            px: 1,
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            borderColor: theme.palette.divider
                          }}
                        >
                          转到行 {error.line}
                        </Button>
                        
                        <Tooltip title="使用本地HDL-LLM-7B模型获取详细解释和修复建议" arrow>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={loadingLLM === error.code ? 
                              <CircularProgress size={14} color="inherit" /> : 
                              <PsychologyIcon fontSize="small" />
                            }
                            onClick={() => handleRequestLLMAnalysis(error.code, error.line)}
                            disabled={loadingLLM !== null}
                            sx={{ 
                              minWidth: 0, 
                              py: 0,
                              fontSize: '0.7rem',
                              textTransform: 'none'
                            }}
                          >
                            {loadingLLM === error.code ? '分析中...' : '详细解释'}
                          </Button>
                        </Tooltip>
                        
                        <Chip 
                          size="small" 
                          label={error.code}
                          sx={{ 
                            ml: 'auto', 
                            height: 20, 
                            fontSize: '0.65rem',
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)'
                          }} 
                        />
                      </Box>
                    }
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { wordBreak: 'break-word' }
                    }}
                    secondaryTypographyProps={{ 
                      component: 'div',
                      sx: { mt: 0.5 }
                    }}
                  />
                </Box>
                
                {/* 快速修复提示 */}
                <Box sx={{ 
                  ml: 4.5, 
                  pl: 1,
                  borderLeft: `1px dashed ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <LightbulbIcon 
                    fontSize="small" 
                    sx={{ 
                      mr: 0.5, 
                      color: theme.palette.mode === 'dark' ? '#ffb74d' : '#f57c00',
                      fontSize: '0.9rem'
                    }} 
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {error.severity === 'error' && error.code === 'E001' && 
                      'always块中需要使用非阻塞赋值(<=)而非阻塞赋值(=)'
                    }
                    {error.severity === 'error' && error.code === 'E002' && 
                      '比较操作需要匹配位宽或使用显式类型转换'
                    }
                    {error.severity === 'warning' && error.code === 'W001' && 
                      '添加default分支可避免意外的锁存器生成'
                    }
                  </Typography>
                </Box>
              </ListItem>
              {index < errors.length - 1 && <Divider />}
            </Box>
          ))
        ) : (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary',
              flexDirection: 'column',
              p: 2
            }}
          >
            <BoltIcon sx={{ mb: 1, fontSize: 40, opacity: 0.7 }} />
            <Typography variant="body2" align="center">
              没有检测到问题
            </Typography>
            <Typography variant="caption" align="center" sx={{ mt: 1 }}>
              TinyBERT-HDL实时检测 | 毫秒级响应
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
};

export default ErrorList; 