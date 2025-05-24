import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Grid, 
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  LinearProgress,
  useTheme,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import SpeedIcon from '@mui/icons-material/Speed';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import InfoIcon from '@mui/icons-material/Info';
import HelpIcon from '@mui/icons-material/Help';
import { OptimizationResult } from '../utils/types';

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
  
  // Intel品牌蓝色
  const intelBlue = '#0071c5';
  const intelLightBlue = '#00b2e3';
  
  // 芯片布局绘制区域引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 绘制芯片布局
  useEffect(() => {
    if (!optimizationResults || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置背景
    ctx.fillStyle = isDarkMode ? '#1A2027' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制专业的芯片布局
    const drawProfessionalChipLayout = () => {
      // 绘制芯片边框
      ctx.strokeStyle = '#0071c5';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 280, 180);
      
      // 添加芯片边框阴影效果
      ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
      ctx.fillRect(15, 15, 275, 175);
      
      // 添加网格背景
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 0.5;
      const gridSize = 10;
      
      for (let x = 10; x <= 290; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 10);
        ctx.lineTo(x, 190);
        ctx.stroke();
      }
      
      for (let y = 10; y <= 190; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(290, y);
        ctx.stroke();
      }
      
      // 绘制CPU核心 - 使用渐变填充
      const cpuGradient = ctx.createLinearGradient(90, 40, 190, 140);
      cpuGradient.addColorStop(0, 'rgba(76, 175, 80, 0.7)');
      cpuGradient.addColorStop(1, 'rgba(76, 175, 80, 0.9)');
      ctx.fillStyle = cpuGradient;
      ctx.fillRect(90, 40, 100, 100);
      
      // CPU标签
      ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CPU', 140, 90);
      
      // 在CPU内部绘制核心
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(100, 50, 35, 35);
      ctx.fillRect(145, 50, 35, 35);
      ctx.fillRect(100, 95, 35, 35);
      ctx.fillRect(145, 95, 35, 35);
      
      // 绘制内存模块 - 使用渐变填充
      const memGradient = ctx.createLinearGradient(40, 40, 40, 160);
      memGradient.addColorStop(0, 'rgba(33, 150, 243, 0.7)');
      memGradient.addColorStop(1, 'rgba(33, 150, 243, 0.9)');
      ctx.fillStyle = memGradient;
      ctx.fillRect(40, 40, 30, 120);
      
      // 内存模块标签
      ctx.save();
      ctx.translate(55, 100);
      ctx.rotate(-Math.PI/2);
      ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Memory', 0, 0);
      ctx.restore();
      
      // 绘制UART模块
      const uartGradient = ctx.createLinearGradient(190, 40, 250, 80);
      uartGradient.addColorStop(0, 'rgba(156, 39, 176, 0.7)');
      uartGradient.addColorStop(1, 'rgba(156, 39, 176, 0.9)');
      ctx.fillStyle = uartGradient;
      ctx.fillRect(190, 40, 60, 40);
      
      // UART模块标签
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('UART', 220, 65);
      
      // 绘制GPIO模块
      const gpioGradient = ctx.createLinearGradient(190, 100, 250, 140);
      gpioGradient.addColorStop(0, 'rgba(255, 193, 7, 0.7)');
      gpioGradient.addColorStop(1, 'rgba(255, 193, 7, 0.9)');
      ctx.fillStyle = gpioGradient;
      ctx.fillRect(190, 100, 60, 40);
      
      // GPIO模块标签
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GPIO', 220, 125);
      
      // 绘制总线连线 - 使用更复杂的连线
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      
      // CPU到内存总线
      ctx.beginPath();
      ctx.moveTo(90, 80);
      ctx.lineTo(80, 80);
      ctx.lineTo(80, 100);
      ctx.lineTo(70, 100);
      ctx.stroke();
      
      // 绘制带箭头的连线
      const drawArrowLine = (fromX: number, fromY: number, toX: number, toY: number) => {
        const headLen = 6;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // 箭头
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI/6), toY - headLen * Math.sin(angle - Math.PI/6));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI/6), toY - headLen * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();
      };
      
      // CPU到UART连线
      drawArrowLine(190, 60, 190 - 10, 60);
      drawArrowLine(190 - 10, 60, 190, 60);
      
      // CPU到GPIO连线
      drawArrowLine(190, 120, 190 - 10, 120);
      drawArrowLine(190 - 10, 120, 190, 120);
      
      // 添加芯片模块边界细节
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      ctx.strokeRect(100, 50, 35, 35);
      ctx.strokeRect(145, 50, 35, 35);
      ctx.strokeRect(100, 95, 35, 35);
      ctx.strokeRect(145, 95, 35, 35);
      
      // 添加引脚细节
      const drawPin = (x: number, y: number, vertical = false) => {
        ctx.fillStyle = '#0071c5';
        if (vertical) {
          ctx.fillRect(x - 1, y, 2, 4);
        } else {
          ctx.fillRect(x, y - 1, 4, 2);
        }
      };
      
      // 添加顶部和底部引脚
      for (let x = 30; x <= 270; x += 15) {
        drawPin(x, 10, false);
        drawPin(x, 190, false);
      }
      
      // 添加左侧和右侧引脚
      for (let y = 30; y <= 170; y += 15) {
        drawPin(10, y, true);
        drawPin(290, y, true);
      }
      
      // 添加图例
      ctx.font = '9px Arial';
      ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      ctx.fillText('优化后芯片利用率: ' + optimizationResults.chipUtilization + '%', 25, 180);
    };
    
    drawProfessionalChipLayout();
    
  }, [optimizationResults, isDarkMode, intelBlue]);
  
  // 渲染帕累托前沿图
  const renderParetoChart = (optimizationResults: OptimizationResult) => {
    if (!optimizationResults || optimizationResults.paretoPoints.length === 0) {
      return null;
    }
    
    // 找到坐标轴的最小值和最大值
    const points = optimizationResults.paretoPoints;
    const powerValues = points.map(p => p.power);
    const freqValues = points.map(p => p.frequency);
    
    const minPower = Math.min(...powerValues) * 0.9;
    const maxPower = Math.max(...powerValues) * 1.1;
    const minFreq = Math.min(...freqValues) * 0.9;
    const maxFreq = Math.max(...freqValues) * 1.1;
    
    // 图表尺寸 - 增大图表尺寸和留白
    const width = 500;
    const height = 250;
    const padding = 40;
    
    // 缩放点坐标以适应图表
    const scaleX = (power: number) => 
      padding + ((width - padding * 2) * (1 - (power - minPower) / (maxPower - minPower)));
    
    const scaleY = (freq: number) => 
      height - padding - ((height - padding * 2) * (freq - minFreq) / (maxFreq - minFreq));
    
    // 生成刻度
    const generateTicks = (min: number, max: number, count: number) => {
      const step = (max - min) / (count - 1);
      return Array.from({ length: count }, (_, i) => min + step * i);
    };
    
    const powerTicks = generateTicks(minPower, maxPower, 5);
    const freqTicks = generateTicks(minFreq, maxFreq, 5);
    
    // 原始点和优化点的索引
    const originalIdx = points.findIndex(p => p.label.includes('原始'));
    const optimizedIdx = points.findIndex(p => p.label.includes('优化'));
    
    return (
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: '100%', display: 'block', fontFamily: 'Arial' }}
      >
        {/* 背景网格 */}
        <g>
          {powerTicks.map((tick, i) => (
            <line 
              key={`vgrid-${i}`}
              x1={scaleX(tick)} 
              y1={padding} 
              x2={scaleX(tick)} 
              y2={height - padding} 
              stroke="#eee" 
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          ))}
          
          {freqTicks.map((tick, i) => (
            <line 
              key={`hgrid-${i}`}
              x1={padding} 
              y1={scaleY(tick)} 
              x2={width - padding} 
              y2={scaleY(tick)} 
              stroke="#eee" 
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          ))}
        </g>
        
        {/* X和Y轴 */}
        <line 
          x1={padding} 
          y1={height - padding} 
          x2={width - padding} 
          y2={height - padding} 
          stroke="#666" 
          strokeWidth="1.5"
        />
        <line 
          x1={padding} 
          y1={padding} 
          x2={padding} 
          y2={height - padding} 
          stroke="#666" 
          strokeWidth="1.5"
        />
        
        {/* 坐标轴刻度 */}
        {powerTicks.map((tick, i) => (
          <g key={`xtick-${i}`}>
            <line 
              x1={scaleX(tick)} 
              y1={height - padding} 
              x2={scaleX(tick)} 
              y2={height - padding + 5} 
              stroke="#666" 
            />
            <text 
              x={scaleX(tick)} 
              y={height - padding + 20} 
              textAnchor="middle" 
              fontSize="10"
              fill="#333"
            >
              {tick.toFixed(1)}W
            </text>
          </g>
        ))}
        
        {freqTicks.map((tick, i) => (
          <g key={`ytick-${i}`}>
            <line 
              x1={padding - 5} 
              y1={scaleY(tick)} 
              x2={padding} 
              y2={scaleY(tick)} 
              stroke="#666" 
            />
            <text 
              x={padding - 8} 
              y={scaleY(tick)} 
              textAnchor="end" 
              fontSize="10"
              fill="#333"
              dominantBaseline="middle"
            >
              {tick.toFixed(0)}MHz
            </text>
          </g>
        ))}
        
        {/* 轴标签 */}
        <text 
          x={width / 2} 
          y={height - 5} 
          textAnchor="middle" 
          fontSize="12"
          fontWeight="bold"
          fill="#333"
        >
          功耗 (W) ←
        </text>
        <text 
          x={15} 
          y={height / 2} 
          textAnchor="middle" 
          fontSize="12"
          fontWeight="bold"
          fill="#333"
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          频率 (MHz) →
        </text>
        
        {/* 绘制帕累托前沿线 */}
        <path
          d={`
            M ${scaleX(points[0].power)} ${scaleY(points[0].frequency)}
            ${points.slice(1).map(point => `L ${scaleX(point.power)} ${scaleY(point.frequency)}`).join(' ')}
          `}
          fill="none"
          stroke="#2196F3"
          strokeWidth={2}
          strokeDasharray="4,2"
        />
        
        {/* 帕累托前沿区域填充 */}
        <path
          d={`
            M ${scaleX(points[0].power)} ${scaleY(points[0].frequency)}
            ${points.slice(1).map(point => `L ${scaleX(point.power)} ${scaleY(point.frequency)}`).join(' ')}
            L ${scaleX(points[points.length-1].power)} ${scaleY(minFreq)}
            L ${scaleX(minPower)} ${scaleY(minFreq)}
            L ${scaleX(minPower)} ${scaleY(points[0].frequency)}
            Z
          `}
          fill="rgba(33, 150, 243, 0.05)"
          stroke="none"
        />
        
        {/* 改进箭头 */}
        {originalIdx >= 0 && optimizedIdx >= 0 && (
          <g>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="0"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#4caf50" />
              </marker>
            </defs>
            <path
              d={`M ${scaleX(points[originalIdx].power)} ${scaleY(points[originalIdx].frequency)} 
                  Q ${(scaleX(points[originalIdx].power) + scaleX(points[optimizedIdx].power)) / 2} 
                    ${(scaleY(points[originalIdx].frequency) + scaleY(points[optimizedIdx].frequency)) / 2 + 20},
                    ${scaleX(points[optimizedIdx].power)} ${scaleY(points[optimizedIdx].frequency)}`}
              fill="none"
              stroke="#4caf50"
              strokeWidth="1.5"
              strokeDasharray="3,2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        )}
        
        {/* 绘制点 */}
        {points.map((point, index) => {
          const isOriginal = point.label.includes('原始');
          const isOptimized = point.label.includes('优化');
          const isSpecial = isOriginal || isOptimized;
          
          return (
            <g key={index}>
              {/* 点周围的高亮圈 */}
              {isSpecial && (
                <circle
                  cx={scaleX(point.power)}
                  cy={scaleY(point.frequency)}
                  r={isSpecial ? 8 : 5}
                  fill="none"
                  stroke={isOriginal ? '#ff5252' : isOptimized ? '#4caf50' : '#2196F3'}
                  strokeWidth="1.5"
                  opacity="0.5"
                />
              )}
              
              {/* 数据点 */}
              <circle
                cx={scaleX(point.power)}
                cy={scaleY(point.frequency)}
                r={isSpecial ? 6 : 4}
                fill={
                  isOriginal ? '#ff5252' :
                  isOptimized ? '#4caf50' : '#2196F3'
                }
                opacity={isSpecial ? 1 : 0.7}
              />
              
              {/* 标签 */}
              <text
                x={scaleX(point.power)}
                y={scaleY(point.frequency) - (isSpecial ? 12 : 8)}
                textAnchor="middle"
                fontSize={isSpecial ? "12" : "10"}
                fontWeight={isSpecial ? "bold" : "normal"}
                fill={
                  isOriginal ? '#ff5252' :
                  isOptimized ? '#4caf50' : '#2196F3'
                }
              >
                {point.label}
              </text>
            </g>
          );
        })}
        
        {/* 图例 */}
        <g transform={`translate(${width - 150}, ${padding + 10})`}>
          <rect width="140" height="70" fill="white" fillOpacity="0.8" stroke="#ccc" rx="4" />
          
          <circle cx="15" cy="15" r="5" fill="#ff5252" />
          <text x="25" y="18" fontSize="10" fill="#333">原始设计</text>
          
          <circle cx="15" cy="35" r="5" fill="#4caf50" />
          <text x="25" y="38" fontSize="10" fill="#333">优化设计</text>
          
          <circle cx="15" cy="55" r="4" fill="#2196F3" />
          <text x="25" y="58" fontSize="10" fill="#333">其他可行设计点</text>
        </g>
      </svg>
    );
  };
  
  // 优化方案说明信息
  const renderOptimizationDetails = (optimizationResults: OptimizationResult) => {
    const improvements = [];
    
    if (optimizationResults.powerImprovement > 0) {
      improvements.push(`功耗减少${optimizationResults.powerImprovement}%`);
    }
    
    if (optimizationResults.frequencyImprovement > 0) {
      improvements.push(`频率提升${optimizationResults.frequencyImprovement}%`);
    }
    
    if (optimizationResults.areaImprovement && optimizationResults.areaImprovement > 0) {
      improvements.push(`面积减少${optimizationResults.areaImprovement}%`);
    }
    
    // 分层次的硬件优化技术解释
    const optimizationsByLevel = {
      rtl: [
        { 
          name: "RTL状态机优化", 
          description: "优化FSM状态编码，减少了寄存器数量并缩短关键路径",
          impact: "面积 -5%, 频率 +8%"
        },
        { 
          name: "数据路径共享", 
          description: "通过资源共享技术复用算术逻辑单元，减少重复硬件",
          impact: "面积 -12%, 功耗 -7%"
        },
        { 
          name: "非阻塞赋值优化", 
          description: "将阻塞赋值(=)转换为非阻塞赋值(<=)，消除时序问题",
          impact: "频率 +5%, 功能稳定性提升"
        },
        { 
          name: "常量折叠与传播", 
          description: "编译时优化，计算并简化常量表达式，减少运行时计算",
          impact: "功耗 -3%, 面积 -2%"
        }
      ],
      gate: [
        { 
          name: "组合逻辑优化", 
          description: "使用逻辑等价变换，简化布尔表达式，减少门数量",
          impact: "面积 -8%, 延迟 -6%"
        },
        { 
          name: "时钟门控", 
          description: "在不活跃时关闭模块的时钟信号，降低动态功耗",
          impact: "功耗 -15%, 门数量 +2%"
        },
        { 
          name: "锁存器消除", 
          description: "分析并消除case语句中的隐式锁存器，提高设计稳定性",
          impact: "稳定性提升, 面积 -1%"
        }
      ],
      physical: [
        { 
          name: "关键路径优化", 
          description: "通过调整布局，缩短了时钟到输出的最长路径",
          impact: "频率 +10%, 时序裕度提高"
        },
        { 
          name: "时钟树平衡", 
          description: "减小了时钟偏斜(clock skew)，提高了时序余量",
          impact: "频率 +4%, 稳定性提升"
        },
        { 
          name: "布线拥塞优化", 
          description: "改进单元放置，缓解局部拥塞区域的布线压力",
          impact: "布线完成度提高，频率 +3%"
        }
      ]
    };
    
    return (
      <Box>
        <Typography variant="body2" sx={{ mb: 2, fontWeight: 'medium' }}>
          云端优化方案通过{improvements.join('、')}，综合提升了设计性能。以下从RTL、门级和物理实现三个层次展示了主要优化技术。
        </Typography>
        
        {/* RTL级优化 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#0071c5', mb: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#0071c5', mr: 1, borderRadius: '50%' }}/>
            RTL级优化
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
            针对Verilog/VHDL源代码和寄存器传输级结构的优化
          </Typography>
          <Box sx={{ ml: 2 }}>
            {optimizationsByLevel.rtl.map((tech, idx) => (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', mr: 1, fontSize: 18 }} />
                  {tech.name}
                  <Chip 
                    size="small" 
                    label={tech.impact} 
                    sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    color="success"
                    variant="outlined"
                  />
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', ml: 4, color: 'text.secondary' }}>
                  {tech.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* 门级优化 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#e91e63', mb: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#e91e63', mr: 1, borderRadius: '50%' }}/>
            门级优化
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
            针对逻辑门、触发器和组合电路结构的优化
          </Typography>
          <Box sx={{ ml: 2 }}>
            {optimizationsByLevel.gate.map((tech, idx) => (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', mr: 1, fontSize: 18 }} />
                  {tech.name}
                  <Chip 
                    size="small" 
                    label={tech.impact} 
                    sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    color="error"
                    variant="outlined"
                  />
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', ml: 4, color: 'text.secondary' }}>
                  {tech.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* 物理实现优化 */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#ff9800', mr: 1, borderRadius: '50%' }}/>
            物理实现优化
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
            针对布局布线、时钟树和物理约束的优化
          </Typography>
          <Box sx={{ ml: 2 }}>
            {optimizationsByLevel.physical.map((tech, idx) => (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', mr: 1, fontSize: 18 }} />
                  {tech.name}
                  <Chip 
                    size="small" 
                    label={tech.impact} 
                    sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    color="warning"
                    variant="outlined"
                  />
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', ml: 4, color: 'text.secondary' }}>
                  {tech.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  };
  
  // 硬件指标可视化组件
  const HardwareMetricVisual = ({ 
    title, 
    beforeValue, 
    afterValue, 
    unit, 
    improvement, 
    isHigherBetter = false,
    color 
  }: { 
    title: string;
    beforeValue: number;
    afterValue: number;
    unit: string;
    improvement: number;
    isHigherBetter?: boolean;
    color: string;
  }) => {
    // 计算指标条比例
    const maxValue = Math.max(beforeValue, afterValue) * 1.2;
    const beforeWidth = (beforeValue / maxValue) * 100;
    const afterWidth = (afterValue / maxValue) * 100;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ mr: 1, width: 54 }}>
            优化前:
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                height: 16, 
                width: `${beforeWidth}%`, 
                bgcolor: 'rgba(0,0,0,0.1)',
                borderRadius: 0.5
              }}
            />
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              {beforeValue} {unit}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ mr: 1, width: 54 }}>
            优化后:
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box 
              sx={{ 
                height: 16, 
                width: `${afterWidth}%`, 
                bgcolor: color,
                borderRadius: 0.5
              }}
            />
            <Typography variant="caption" sx={{ ml: 1, fontWeight: 'bold' }}>
              {afterValue} {unit}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Chip 
            size="small"
            icon={isHigherBetter ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
            label={`${isHigherBetter ? '提升' : '降低'} ${improvement}%`}
            color={isHigherBetter ? "success" : "error"}
            sx={{ height: 20, fontSize: '0.65rem' }}
            variant="outlined"
          />
        </Box>
      </Box>
    );
  };
  
  // 合成统计信息组件
  const SynthesisStatistics = ({ optimizationResults }: { optimizationResults: OptimizationResult }) => {
    const stats = [
      { name: 'LUT 使用量', before: 3450, after: 2967, unit: '个' },
      { name: 'FF 使用量', before: 1876, after: 1652, unit: '个' },
      { name: 'BRAM 使用量', before: 12, after: 8, unit: '个' },
      { name: 'DSP 使用量', before: 24, after: 16, unit: '个' },
      { name: '最大时钟频率', before: 172.6, after: 203.7, unit: 'MHz' },
      { name: '关键路径延迟', before: 5.8, after: 4.9, unit: 'ns' }
    ];
    
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>合成统计</Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>资源</TableCell>
                    <TableCell align="right">优化前</TableCell>
                    <TableCell align="right">优化后</TableCell>
                    <TableCell align="right">变化</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.slice(0, 4).map((stat, idx) => {
                    const change = Math.round((stat.after - stat.before) / stat.before * 100);
                    return (
                      <TableRow key={idx}>
                        <TableCell component="th" scope="row">
                          {stat.name}
                        </TableCell>
                        <TableCell align="right">{stat.before}</TableCell>
                        <TableCell align="right">{stat.after}</TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ color: change < 0 ? 'success.main' : change > 0 ? 'error.main' : 'inherit' }}
                        >
                          {change > 0 ? '+' : ''}{change}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={6}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>时序</TableCell>
                    <TableCell align="right">优化前</TableCell>
                    <TableCell align="right">优化后</TableCell>
                    <TableCell align="right">变化</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.slice(4).map((stat, idx) => {
                    const change = Math.round((stat.after - stat.before) / stat.before * 100);
                    const isImprovement = stat.name.includes('频率') ? change > 0 : change < 0;
                    return (
                      <TableRow key={idx}>
                        <TableCell component="th" scope="row">
                          {stat.name}
                        </TableCell>
                        <TableCell align="right">{stat.before}</TableCell>
                        <TableCell align="right">{stat.after}</TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ color: isImprovement ? 'success.main' : 'error.main' }}
                        >
                          {change > 0 ? '+' : ''}{change}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  const backgroundColor = isDarkMode ? '#1A2027' : '#f5f9ff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: backgroundColor,
        borderColor: borderColor,
        overflow: 'hidden'
      }}
    >
      {/* 标题栏和Intel Gaudi2标签 */}
      <Box sx={{ 
        p: 1, 
        pl: 2,
        display: 'flex', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="subtitle1" sx={{ fontFamily: 'Consolas, monospace' }}>
          云端优化结果
        </Typography>
        <Chip 
          size="small" 
          label="Intel Gaudi2"
          sx={{ 
            ml: 1,
            bgcolor: isDarkMode ? 'rgba(0, 178, 227, 0.15)' : 'rgba(0, 178, 227, 0.08)',
            color: intelLightBlue,
            border: `1px solid ${isDarkMode ? 'rgba(0, 178, 227, 0.3)' : 'rgba(0, 178, 227, 0.2)'}`,
            fontFamily: 'Consolas, monospace',
            height: 20,
            fontSize: '0.65rem'
          }}
        />
      </Box>
      
      {/* 内容区域 - 滚动容器 */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {!optimizationResults && !isLoading ? (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            p: 3
          }}>
            <CloudIcon sx={{ fontSize: 60, mb: 2, color: 'text.secondary', opacity: 0.5 }} />
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              运行云端优化以查看结果
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              云端优化将提供功耗、性能和面积的综合优化方案
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
              正在进行云端优化...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {/* 优化指标概要 - 更简洁的布局 */}
            <Typography variant="subtitle2" sx={{ mb: 1, pl: 1 }}>
              优化指标概要
            </Typography>
            
            <Box sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)' }}>
              <Grid container sx={{ px: 1, py: 1.5 }}>
                {/* 功耗 */}
                <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <BoltIcon sx={{ color: 'error.main', fontSize: 18, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      功耗
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ArrowDownwardIcon 
                      fontSize="small" 
                      sx={{ color: 'success.main', fontSize: 14, mr: 0.5 }} 
                    />
                    <Typography variant="body2">
                      降低了 {optimizationResults.powerImprovement}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                      {optimizationResults.powerBefore} W
                    </Typography>
                    <ArrowRightIcon sx={{ mx: 0.5, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {optimizationResults.powerAfter} W
                    </Typography>
                  </Box>
                </Grid>
                
                {/* 频率 */}
                <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <SpeedIcon sx={{ color: 'success.main', fontSize: 18, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      频率
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ArrowUpwardIcon 
                      fontSize="small" 
                      sx={{ color: 'success.main', fontSize: 14, mr: 0.5 }} 
                    />
                    <Typography variant="body2">
                      提升了 {optimizationResults.frequencyImprovement}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                      {optimizationResults.frequencyBefore} MHz
                    </Typography>
                    <ArrowRightIcon sx={{ mx: 0.5, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {optimizationResults.frequencyAfter} MHz
                    </Typography>
                  </Box>
                </Grid>
                
                {/* 面积 */}
                <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <AspectRatioIcon sx={{ color: 'info.main', fontSize: 18, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      面积
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ArrowDownwardIcon 
                      fontSize="small" 
                      sx={{ color: 'success.main', fontSize: 14, mr: 0.5 }} 
                    />
                    <Typography variant="body2">
                      减少了 {optimizationResults.areaImprovement}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                      {optimizationResults.areaBefore} μm²
                    </Typography>
                    <ArrowRightIcon sx={{ mx: 0.5, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {optimizationResults.areaAfter} μm²
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            {/* 优化方案详情说明 */}
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, pl: 1 }}>
              优化方案详细说明
            </Typography>
            <Box sx={{ 
              mb: 3, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)' 
            }}>
              {renderOptimizationDetails(optimizationResults)}
            </Box>
            
            {/* 硬件资源与时序分析 */}
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, pl: 1 }}>
              硬件资源与时序分析
            </Typography>
            <Box sx={{ 
              mb: 3, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)' 
            }}>
              <SynthesisStatistics optimizationResults={optimizationResults} />
            </Box>
            
            {/* 关键性能指标可视化 */}
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, pl: 1 }}>
              关键性能指标可视化
            </Typography>
            <Box sx={{ 
              mb: 3, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)' 
            }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <HardwareMetricVisual
                    title="功耗"
                    beforeValue={Number(optimizationResults.powerBefore)}
                    afterValue={Number(optimizationResults.powerAfter)} 
                    unit="W"
                    improvement={optimizationResults.powerImprovement}
                    isHigherBetter={false}
                    color="rgba(244, 67, 54, 0.7)"
                  />
                  
                  <HardwareMetricVisual
                    title="频率"
                    beforeValue={Number(optimizationResults.frequencyBefore)}
                    afterValue={Number(optimizationResults.frequencyAfter)}
                    unit="MHz"
                    improvement={optimizationResults.frequencyImprovement}
                    isHigherBetter={true}
                    color="rgba(76, 175, 80, 0.7)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <HardwareMetricVisual
                    title="面积"
                    beforeValue={Number(optimizationResults.areaBefore)}
                    afterValue={Number(optimizationResults.areaAfter)}
                    unit="μm²"
                    improvement={optimizationResults.areaImprovement}
                    isHigherBetter={false}
                    color="rgba(33, 150, 243, 0.7)"
                  />
                  
                  <HardwareMetricVisual
                    title="时序裕度"
                    beforeValue={0.78}
                    afterValue={1.24}
                    unit="ns"
                    improvement={59}
                    isHigherBetter={true}
                    color="rgba(156, 39, 176, 0.7)"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(255, 243, 224, 0.5)', borderRadius: 1, border: '1px dashed rgba(255, 152, 0, 0.5)' }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoIcon sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                  教学提示：时序裕度(Timing Slack)越大表示电路越稳定，超过0表示满足时序约束。
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {/* 左侧：应用的优化技术 */}
              <Grid item xs={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, pl: 1 }}>
                    应用的优化技术
                  </Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)' }}>
                    <List dense sx={{ py: 0.5 }}>
                      {optimizationResults.optimizationTechniques?.map((technique, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 1.5 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckCircleIcon fontSize="small" sx={{ color: '#4caf50', fontSize: 18 }} />
                          </ListItemIcon>
                          <Typography variant="body2">{technique}</Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Box>
                
                {/* 芯片利用率 */}
                <Box sx={{ mb: 2, mt: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, pl: 1 }}>
                    芯片资源利用率
                  </Typography>
                  <Box sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    p: 2,
                    bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        总体利用率: {optimizationResults.chipUtilization}%
                      </Typography>
                      <Chip
                        size="small"
                        label={optimizationResults.chipUtilization > 70 ? "偏高" : optimizationResults.chipUtilization < 40 ? "偏低" : "适中"}
                        color={optimizationResults.chipUtilization > 70 ? "warning" : optimizationResults.chipUtilization < 40 ? "info" : "success"}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={optimizationResults.chipUtilization || 0}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: optimizationResults.chipUtilization > 70 ? '#ff9800' : 
                                          optimizationResults.chipUtilization < 40 ? '#2196f3' : '#4caf50'
                        }
                      }}
                    />
                    
                    <Grid container spacing={1} sx={{ mt: 2 }}>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">LUT 利用率</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>58%</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">FF 利用率</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>42%</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 1.5, p: 1, bgcolor: 'rgba(232, 244, 253, 0.5)', borderRadius: 1, border: '1px dashed rgba(33, 150, 243, 0.4)' }}>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                        <InfoIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                        教学注解：资源利用率表示设计占用目标芯片资源的百分比，过高可能导致布线困难，过低则资源浪费
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              
              {/* 右侧：芯片布局预览 */}
              <Grid item xs={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, pl: 1 }}>
                  芯片布局预览
                </Typography>
                <Box sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  height: 272,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)'
                }}>
                  <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <canvas ref={canvasRef} width={300} height={200} />
                  </Box>
                  
                  <Box sx={{ p: 1, bgcolor: 'rgba(232, 244, 253, 0.5)', borderRadius: '0 0 4px 4px', border: '1px dashed rgba(33, 150, 243, 0.4)', borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                      <InfoIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                      教学提示：上图为优化后的物理布局，颜色表示不同模块类型，连线表示关键数据路径
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {/* 帕累托前沿图 */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, pl: 1, mt: 1, display: 'flex', alignItems: 'center' }}>
                  功耗-性能帕累托前沿
                  <Tooltip title="帕累托前沿展示了不同设计点的权衡关系，前沿线上的点表示最优解，无法在不牺牲一个指标的情况下提升另一个指标">
                    <HelpIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.secondary' }} />
                  </Tooltip>
                </Typography>
                <Box sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  p: 1,
                  bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {renderParetoChart(optimizationResults)}
                  
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(232, 244, 253, 0.5)', borderRadius: 1, border: '1px dashed rgba(33, 150, 243, 0.4)' }}>
                    <Typography variant="caption">
                      <strong>教学解释：</strong> 帕累托前沿表示在不牺牲一个指标的情况下，无法再提高另一个指标的所有最优解集合。
                      图中曲线下方的点为次优解，曲线上的点各有优势，需根据设计需求选择合适的优化方案。
                      本设计选择了优化后的点，在提高频率的同时显著降低了功耗，实现了全局最优。
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CloudOptimizationViewer; 