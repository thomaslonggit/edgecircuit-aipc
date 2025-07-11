import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Chip, 
  Grid, 
  IconButton, 
  Tooltip,
  useTheme
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import { SimulationResult } from '../utils/types';

interface WaveformViewerProps {
  simulationResults: SimulationResult | null;
  isLoading?: boolean;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({ 
  simulationResults,
  isLoading = false
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 波形绘制区域引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 缩放状态
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Intel品牌蓝色
  const intelBlue = '#0071c5';
  const intelLightBlue = '#00b2e3';
  
  // 绘制波形函数
  useEffect(() => {
    if (!simulationResults || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置背景
    ctx.fillStyle = isDarkMode ? '#1A2027' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // 垂直网格线
    const gridSize = 20 * zoomLevel;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // 水平网格线
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // 定义一些示例信号
    const signals = [
      { name: 'clk', type: 'clock', color: '#4CAF50' },
      { name: 'rst_n', type: 'digital', color: '#F44336' },
      { name: 'tx_valid', type: 'digital', color: '#2196F3' },
      { name: 'tx_ready', type: 'digital', color: '#FF9800' },
      { name: 'tx_data', type: 'bus', width: 8, color: '#9C27B0' },
      { name: 'rx', type: 'digital', color: '#009688' },
      { name: 'rx_valid', type: 'digital', color: '#673AB7' },
      { name: 'rx_data', type: 'bus', width: 8, color: '#3F51B5' }
    ];
    
    // 绘制时间轴
    ctx.fillStyle = isDarkMode ? '#E0E0E0' : '#333333';
    ctx.font = '10px Consolas, monospace';
    
    for (let x = 0; x < canvas.width; x += gridSize * 5) {
      const timeValue = x / (gridSize * 2);
      ctx.fillText(`${timeValue}ns`, x + 2, 10);
    }
    
    // 绘制信号名称
    const signalHeight = 30;
    const signalNameWidth = 80;
    
    ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, signalNameWidth, canvas.height);
    
    signals.forEach((signal, index) => {
      const y = 20 + index * signalHeight;
      
      // 信号名称
      ctx.fillStyle = isDarkMode ? '#E0E0E0' : '#333333';
      ctx.font = '12px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      let signalLabel = signal.name;
      if (signal.type === 'bus') {
        signalLabel = `${signal.name}[${signal.width-1}:0]`;
      }
      
      ctx.fillText(signalLabel, 5, y);
      
      // 根据信号类型绘制波形
      ctx.strokeStyle = signal.color;
      ctx.lineWidth = 2;
      
      // 波形绘制起点
      const startX = signalNameWidth;
      
      if (signal.type === 'clock') {
        // 绘制时钟信号
        const clockWidth = gridSize * 2;
        let x = startX;
        
        while (x < canvas.width) {
          // 上升沿
          ctx.beginPath();
          ctx.moveTo(x, y + 10);
          ctx.lineTo(x, y - 10);
          ctx.lineTo(x + clockWidth/2, y - 10);
          ctx.stroke();
          
          // 下降沿
          ctx.beginPath();
          ctx.moveTo(x + clockWidth/2, y - 10);
          ctx.lineTo(x + clockWidth/2, y + 10);
          ctx.lineTo(x + clockWidth, y + 10);
          ctx.stroke();
          
          x += clockWidth;
        }
      } else if (signal.type === 'digital') {
        // 绘制数字信号
        const values = generateDigitalSignal(Math.floor((canvas.width - startX) / (gridSize * zoomLevel)));
        let x = startX;
        let prevValue = values[0];
        let prevX = x;
        
        // 绘制起始点
        ctx.beginPath();
        ctx.moveTo(x, prevValue ? y - 10 : y + 10);
        
        for (let i = 1; i < values.length; i++) {
          const segmentWidth = gridSize * 3 * zoomLevel;
          x = startX + i * segmentWidth;
          
          if (values[i] !== prevValue) {
            // 垂直边沿
            ctx.lineTo(x, prevValue ? y - 10 : y + 10);
            ctx.lineTo(x, values[i] ? y - 10 : y + 10);
            prevValue = values[i];
          }
          
          // 水平线
          if (i === values.length - 1) {
            ctx.lineTo(canvas.width, prevValue ? y - 10 : y + 10);
          }
        }
        
        ctx.stroke();
      } else if (signal.type === 'bus') {
        // 绘制总线数据
        const segments = Math.floor((canvas.width - startX) / (gridSize * 4 * zoomLevel));
        let x = startX;
        
        for (let i = 0; i < segments; i++) {
          const segmentWidth = gridSize * 4 * zoomLevel;
          const value = generateHexValue(signal.width ? signal.width / 4 : 2);
          
          // 填充背景
          ctx.fillStyle = hexToRGBA(signal.color, 0.2);
          ctx.fillRect(x, y - 12, segmentWidth, 24);
          
          // 绘制边框
          ctx.strokeStyle = signal.color;
          ctx.strokeRect(x, y - 12, segmentWidth, 24);
          
          // 绘制数值
          ctx.fillStyle = isDarkMode ? '#E0E0E0' : '#333333';
          ctx.font = '10px Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value, x + segmentWidth/2, y);
          
          x += segmentWidth;
        }
      }
    });
    
  }, [simulationResults, isDarkMode, zoomLevel]);
  
  // 生成随机数字信号
  const generateDigitalSignal = (length: number): boolean[] => {
    const signal: boolean[] = [];
    let currentValue = Math.random() > 0.5;
    
    for (let i = 0; i < length; i++) {
      if (Math.random() > 0.7) {
        currentValue = !currentValue;
      }
      signal.push(currentValue);
    }
    
    return signal;
  };
  
  // 生成随机十六进制值
  const generateHexValue = (length: number): string => {
    const chars = '0123456789ABCDEF';
    let result = '0x';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  };
  
  // 颜色转RGBA
  const hexToRGBA = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // 处理缩放
  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(prev => prev + 0.2);
    }
  };
  
  const handleZoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(prev => prev - 0.2);
    }
  };
  
  const backgroundColor = isDarkMode ? '#1A2027' : '#f5f9ff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  return (
    <Paper 
      elevation={0} 
      variant="outlined"
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: backgroundColor,
        borderColor: borderColor,
        overflow: 'hidden'
      }}
    >
      {/* 波形查看器标题栏 */}
      <Box sx={{ 
        p: 1, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MemoryIcon sx={{ mr: 1, color: intelBlue }} />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Consolas, monospace' }}>
            波形查看器
          </Typography>
          <Chip 
            size="small" 
            label="Intel Core Ultra"
            sx={{ 
              ml: 1,
              bgcolor: isDarkMode ? 'rgba(0, 113, 197, 0.15)' : 'rgba(0, 113, 197, 0.08)',
              color: intelBlue,
              border: `1px solid ${isDarkMode ? 'rgba(0, 113, 197, 0.3)' : 'rgba(0, 113, 197, 0.2)'}`,
              fontFamily: 'Consolas, monospace',
              height: 20,
              fontSize: '0.65rem'
            }}
          />
        </Box>
        
        <Box>
          <Tooltip title="放大">
            <IconButton size="small" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="缩小">
            <IconButton size="small" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* 波形图显示区域 - 添加滚动容器 */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {!simulationResults && !isLoading ? (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            p: 3
          }}>
            <TimerIcon sx={{ fontSize: 60, mb: 2, color: 'text.secondary', opacity: 0.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              运行本地仿真以查看波形图
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              波形图将显示UART控制器的时序信号
            </Typography>
          </Box>
        ) : isLoading ? (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            p: 3
          }}>
            <div className="loader"></div>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              生成波形图中...
            </Typography>
          </Box>
        ) : (
          <>
            {/* 仿真结果摘要 */}
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SpeedIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                    <Typography variant="body2">
                      频率: <strong>{simulationResults.frequency} MHz</strong>
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CompareArrowsIcon fontSize="small" sx={{ mr: 0.5, color: 'secondary.main' }} />
                    <Typography variant="body2">
                      功耗: <strong>{simulationResults.power} W</strong>
                    </Typography>
                  </Box>
                </Grid>
                
                {simulationResults.timing && (
                  <>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'info.main' }} />
                        <Typography variant="body2">
                          最大延迟: <strong>{simulationResults.timing.maxDelay} ns</strong>
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {simulationResults.timing.setupViolations > 0 || simulationResults.timing.holdViolations > 0 ? (
                          <ReportProblemIcon fontSize="small" sx={{ mr: 0.5, color: 'error.main' }} />
                        ) : (
                          <CheckCircleIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />
                        )}
                        <Typography variant="body2">
                          时序违例: 
                          <strong>
                            {simulationResults.timing.setupViolations > 0 || simulationResults.timing.holdViolations > 0 ? 
                              ` ${simulationResults.timing.setupViolations} setup, ${simulationResults.timing.holdViolations} hold` : 
                              ' 无'}
                          </strong>
                        </Typography>
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
            
            {/* 波形画布 - 确保可以滚动 */}
            <Box sx={{ p: 0, minHeight: 'min-content' }}>
              <canvas 
                ref={canvasRef} 
                width={1200 * zoomLevel} 
                height={260}
                style={{ display: 'block' }}
              />
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default WaveformViewer; 