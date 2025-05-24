import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';

interface IntelLoadingIndicatorProps {
  loading: boolean;
  loadingText?: string;
}

const IntelLoadingIndicator: React.FC<IntelLoadingIndicatorProps> = ({ 
  loading, 
  loadingText = '加载中...' 
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [dataPackets, setDataPackets] = useState<{ id: number; right: boolean; position: number }[]>([]);
  
  // Intel品牌蓝色
  const intelBlue = '#0071c5';
  const intelLightBlue = '#00b2e3';
  
  // 动画数据包
  useEffect(() => {
    if (!loading) {
      setDataPackets([]);
      return;
    }
    
    // 初始化数据包
    setDataPackets([
      { id: 1, right: true, position: 0 },
      { id: 2, right: false, position: 100 },
      { id: 3, right: true, position: 20 }
    ]);
    
    // 动画间隔
    const interval = setInterval(() => {
      setDataPackets(prev => {
        return prev.map(packet => {
          let newPosition = packet.right ? packet.position + 2 : packet.position - 2;
          
          // 重置位置，形成循环动画
          if (newPosition > 100) {
            newPosition = 0;
          } else if (newPosition < 0) {
            newPosition = 100;
          }
          
          return {
            ...packet,
            position: newPosition
          };
        });
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [loading]);
  
  if (!loading) return null;
  
  return (
    <Box sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.85)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: isDarkMode ? '#1A2027' : '#ffffff',
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
        maxWidth: 350
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            color: isDarkMode ? '#e0e0e0' : '#333',
            fontFamily: 'Consolas, monospace',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Box 
            component="img" 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Intel_logo_%282006-2020%29.svg/200px-Intel_logo_%282006-2020%29.svg.png"
            sx={{ height: 20, mr: 1 }}
            alt="Intel Logo"
          />
          {loadingText}
        </Typography>
        
        {/* 端云协同示意图 */}
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: 80, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          my: 2
        }}>
          {/* 客户端 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            zIndex: 2
          }}>
            <ComputerIcon sx={{ 
              fontSize: 36, 
              color: isDarkMode ? '#7fbfff' : intelBlue,
              mb: 0.5
            }} />
            <Typography variant="caption" sx={{ 
              color: isDarkMode ? '#7fbfff' : intelBlue,
              fontFamily: 'Consolas, monospace',
              fontSize: '0.7rem'
            }}>
              客户端
            </Typography>
          </Box>
          
          {/* 连接线 */}
          <Box sx={{ 
            position: 'absolute', 
            left: 45, 
            right: 45, 
            top: 18, 
            height: 2, 
            bgcolor: isDarkMode ? '#455a64' : '#e0e0e0',
            zIndex: 1
          }} />
          
          {/* 数据包动画 */}
          {dataPackets.map(packet => (
            <Box 
              key={packet.id}
              sx={{
                position: 'absolute',
                left: `${packet.position}%`,
                top: 11,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              {packet.right ? (
                <ArrowRightAltIcon sx={{ 
                  fontSize: 16, 
                  color: isDarkMode ? '#7fbfff' : intelBlue
                }} />
              ) : (
                <KeyboardArrowLeftIcon sx={{ 
                  fontSize: 16, 
                  color: isDarkMode ? '#a0d0ff' : intelLightBlue
                }} />
              )}
            </Box>
          ))}
          
          {/* 云端 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            zIndex: 2
          }}>
            <CloudIcon sx={{ 
              fontSize: 36, 
              color: isDarkMode ? '#a0d0ff' : intelLightBlue,
              mb: 0.5
            }} />
            <Typography variant="caption" sx={{ 
              color: isDarkMode ? '#a0d0ff' : intelLightBlue,
              fontFamily: 'Consolas, monospace',
              fontSize: '0.7rem'
            }}>
              云服务
            </Typography>
          </Box>
        </Box>
        
        <CircularProgress 
          size={30} 
          thickness={4} 
          sx={{ 
            color: isDarkMode ? '#7fbfff' : intelBlue,
            mt: 1
          }} 
        />
        
        <Typography variant="caption" sx={{ 
          mt: 2, 
          color: isDarkMode ? '#a0a0a0' : '#666',
          fontFamily: 'Consolas, monospace',
          fontSize: '0.7rem',
          textAlign: 'center'
        }}>
          正在使用Intel® Gaudi®2加速器<br/>进行硬件设计分析
        </Typography>
      </Box>
    </Box>
  );
};

export default IntelLoadingIndicator; 