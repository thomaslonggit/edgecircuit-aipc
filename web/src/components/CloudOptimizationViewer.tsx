import { useState, useContext } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Grid, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import CodeIcon from '@mui/icons-material/Code';
import CompareIcon from '@mui/icons-material/Compare';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { OptimizationResult } from '../utils/types';
import { AppContext } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';

interface CloudOptimizationViewerProps {
  optimizationResults: OptimizationResult | null;
  isLoading?: boolean;
}

const CloudOptimizationViewer: React.FC<CloudOptimizationViewerProps> = ({ 
  optimizationResults,
  isLoading = false
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { setCode } = useContext(AppContext);
  
  // 代码预览对话框状态
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  
  // Intel品牌蓝色
  const intelBlue = '#0071c5';
  const intelLightBlue = '#00b2e3';
  
  // 处理查看优化后代码
  const handleViewCode = () => {
    setCodeDialogOpen(true);
  };
  
  // 处理应用优化后代码
  const handleApplyCode = () => {
    setCodeDialogOpen(false);
    setReplaceConfirmOpen(true);
  };
  
  // 确认替换代码
  const handleConfirmReplace = () => {
    if (optimizationResults?.optimized_code) {
      setCode(optimizationResults.optimized_code);
      setReplaceConfirmOpen(false);
    }
  };
  
  // 如果正在加载
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CloudIcon sx={{ fontSize: 60, color: intelBlue, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          正在进行云端优化...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          请耐心等待，优化过程可能需要几分钟
        </Typography>
      </Box>
    );
  }
  
  // 如果没有结果
  if (!optimizationResults) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CloudIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          云端优化
        </Typography>
        <Typography variant="body2" color="text.secondary">
          点击"云端优化"按钮开始优化您的Verilog代码
        </Typography>
      </Box>
    );
  }
  
  // 如果优化失败
  if (optimizationResults.status !== 'completed') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            优化失败
          </Typography>
          <Typography variant="body2">
            {optimizationResults.error_details || '优化过程中发生未知错误'}
          </Typography>
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      height: '100%', 
      overflow: 'auto',
      bgcolor: 'transparent',  // 确保背景透明
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      },
      '&::-webkit-scrollbar-thumb': {
        background: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
        borderRadius: '4px',
      },
    }}>
      <Box sx={{ p: 2 }}>
        {/* 优化成功标题 - 去除背景横条 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3,
          p: 2,
          borderRadius: 2,
          bgcolor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
          border: `1px solid ${isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`,
        }}>
          <CheckCircleIcon sx={{ color: '#4caf50', mr: 2, fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
              优化完成
            </Typography>
            <Typography variant="body2" color="text.secondary">
              云端优化已成功完成，查看下方结果
            </Typography>
          </Box>
          <Chip 
            icon={<CloudIcon />}
            label="云端优化"
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(0, 113, 197, 0.15)' : 'rgba(0, 113, 197, 0.08)',
              color: intelBlue,
              border: `1px solid ${isDarkMode ? 'rgba(0, 113, 197, 0.3)' : 'rgba(0, 113, 197, 0.2)'}`,
            }}
          />
        </Box>
        
        {/* 优化统计信息 */}
        {optimizationResults.optimization_stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                borderRadius: 2,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(0, 113, 197, 0.1) 0%, rgba(0, 113, 197, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(0, 113, 197, 0.05) 0%, rgba(0, 113, 197, 0.02) 100%)',
                border: `1px solid ${isDarkMode ? 'rgba(0, 113, 197, 0.2)' : 'rgba(0, 113, 197, 0.1)'}`,
              }}>
                <SpeedIcon sx={{ color: intelBlue, mb: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: intelBlue }}>
                  {optimizationResults.optimization_stats.execution_time.toFixed(2)}s
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  执行时间
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                borderRadius: 2,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.02) 100%)',
                border: `1px solid ${isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)'}`,
              }}>
                <AssignmentIcon sx={{ color: '#4caf50', mb: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {optimizationResults.optimization_stats.trials_completed}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  试验次数
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                borderRadius: 2,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.02) 100%)',
                border: `1px solid ${isDarkMode ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)'}`,
              }}>
                <CodeIcon sx={{ color: '#ff9800', mb: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                  {optimizationResults.optimization_stats.original_stats.total_lines} → {optimizationResults.optimization_stats.optimized_stats.total_lines}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  代码行数
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                borderRadius: 2,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(156, 39, 176, 0.02) 100%)',
                border: `1px solid ${isDarkMode ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)'}`,
              }}>
                <MemoryIcon sx={{ color: '#9c27b0', mb: 1, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                  {optimizationResults.optimization_stats.original_stats.wire_count} → {optimizationResults.optimization_stats.optimized_stats.wire_count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  信号线数
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
        
        {/* 优化总结报告 - 改进样式 */}
        {optimizationResults.optimization_summary && (
          <Paper sx={{ 
            p: 0,
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${isDarkMode ? 'rgba(0, 113, 197, 0.2)' : 'rgba(0, 113, 197, 0.1)'}`,
          }}>
            {/* 标题区域 */}
            <Box sx={{ 
              p: 2,
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(0, 113, 197, 0.1) 0%, rgba(0, 113, 197, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(0, 113, 197, 0.05) 0%, rgba(0, 113, 197, 0.02) 100%)',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(0, 113, 197, 0.2)' : 'rgba(0, 113, 197, 0.1)'}`,
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: intelBlue }}>
                📊 优化总结报告
              </Typography>
            </Box>
            
            {/* 内容区域 */}
            <Box sx={{ p: 3 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: intelBlue, mb: 2, mt: 1 }}>
                      {children}
                    </Typography>
                  ),
                  h2: ({ children }) => (
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: intelBlue, mb: 1.5, mt: 2 }}>
                      {children}
                    </Typography>
                  ),
                  h3: ({ children }) => (
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: intelBlue, mb: 1, mt: 1.5 }}>
                      {children}
                    </Typography>
                  ),
                  p: ({ children }) => (
                    <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7, color: 'text.primary' }}>
                      {children}
                    </Typography>
                  ),
                  ul: ({ children }) => (
                    <List dense sx={{ py: 0, mb: 1 }}>
                      {children}
                    </List>
                  ),
                  li: ({ children }) => (
                    <ListItem sx={{ py: 0.5, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <Typography variant="body2" sx={{ color: intelBlue }}>•</Typography>
                      </ListItemIcon>
                      <ListItemText>
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{children}</Typography>
                      </ListItemText>
                    </ListItem>
                  ),
                  code: ({ children }) => (
                    <Typography 
                      component="code" 
                      sx={{ 
                        fontFamily: 'Consolas, "Courier New", monospace',
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        px: 0.8,
                        py: 0.4,
                        borderRadius: 1,
                        fontSize: '0.9em',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      }}
                    >
                      {children}
                    </Typography>
                  ),
                  pre: ({ children }) => (
                    <Paper 
                      sx={{ 
                        p: 2, 
                        my: 2,
                        bgcolor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: 2,
                        overflow: 'auto'
                      }}
                    >
                      <Typography 
                        component="pre" 
                        sx={{ 
                          fontFamily: 'Consolas, "Courier New", monospace',
                          fontSize: '0.85em',
                          lineHeight: 1.4,
                          margin: 0,
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {children}
                      </Typography>
                    </Paper>
                  ),
                  // 自定义表格渲染 - 关键改进
                  table: ({ children }) => (
                    <TableContainer component={Paper} sx={{ my: 2, border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                      <Table size="small">
                        {children}
                      </Table>
                    </TableContainer>
                  ),
                  thead: ({ children }) => (
                    <TableHead sx={{ 
                      bgcolor: isDarkMode ? 'rgba(0, 113, 197, 0.1)' : 'rgba(0, 113, 197, 0.05)' 
                    }}>
                      {children}
                    </TableHead>
                  ),
                  tbody: ({ children }) => (
                    <TableBody>
                      {children}
                    </TableBody>
                  ),
                  tr: ({ children }) => (
                    <TableRow>
                      {children}
                    </TableRow>
                  ),
                  th: ({ children }) => (
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      color: intelBlue,
                      fontSize: '0.9rem',
                      fontFamily: 'Consolas, "Courier New", monospace'
                    }}>
                      {children}
                    </TableCell>
                  ),
                  td: ({ children }) => (
                    <TableCell sx={{ 
                      fontSize: '0.85rem',
                      fontFamily: 'Consolas, "Courier New", monospace',
                      py: 1
                    }}>
                      {children}
                    </TableCell>
                  ),
                }}
              >
                {optimizationResults.optimization_summary}
              </ReactMarkdown>
            </Box>
          </Paper>
        )}
        
        {/* 操作按钮区域 */}
        {optimizationResults.optimized_code && (
          <Paper sx={{ 
            p: 2,
            borderRadius: 2,
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(0, 113, 197, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(76, 175, 80, 0.02) 0%, rgba(0, 113, 197, 0.02) 100%)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}>
            <Typography variant="subtitle2" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
              🎉 优化完成！您可以查看或应用优化后的代码
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<CompareIcon />}
                onClick={handleViewCode}
                sx={{ 
                  color: intelBlue,
                  borderColor: intelBlue,
                  '&:hover': {
                    borderColor: intelBlue,
                    bgcolor: `${intelBlue}10`
                  }
                }}
              >
                查看优化后代码
              </Button>
              
              <Button
                variant="contained"
                startIcon={<CodeIcon />}
                onClick={handleApplyCode}
                sx={{ 
                  bgcolor: intelBlue,
                  '&:hover': {
                    bgcolor: '#005a9e'
                  }
                }}
              >
                应用到编辑器
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
      
      {/* 代码预览对话框 */}
      <Dialog 
        open={codeDialogOpen} 
        onClose={() => setCodeDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CodeIcon sx={{ mr: 1, color: intelBlue }} />
            优化后的代码
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Editor
            height="100%"
            language="verilog"
            value={optimizationResults.optimized_code || ''}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              fontSize: 14,
              automaticLayout: true,
            }}
            theme={isDarkMode ? "vs-dark" : "light"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCodeDialogOpen(false)}>
            关闭
          </Button>
          <Button 
            variant="contained" 
            onClick={handleApplyCode}
            sx={{ 
              bgcolor: intelBlue,
              '&:hover': { bgcolor: '#005a9e' }
            }}
          >
            应用到编辑器
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 替换确认对话框 */}
      <Dialog open={replaceConfirmOpen} onClose={() => setReplaceConfirmOpen(false)}>
        <DialogTitle>确认替换代码</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            您确定要将当前编辑器中的代码替换为优化后的代码吗？
          </Typography>
          <Typography variant="body2" color="text.secondary">
            此操作将会覆盖编辑器中的所有内容，请确保已保存重要代码。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceConfirmOpen(false)}>
            取消
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleConfirmReplace}
            sx={{ 
              bgcolor: intelBlue,
              '&:hover': { bgcolor: '#005a9e' }
            }}
          >
            确认替换
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CloudOptimizationViewer; 