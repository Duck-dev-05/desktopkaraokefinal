import React from 'react';
import { NavLink } from "react-router-dom";
import { Home, Compass, ListVideo, History as HistoryIcon, Settings } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

const BottomNav = () => {
  const { currentVideo } = usePlayer();
  const bottomOffset = currentVideo ? '90px' : '0px';

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: 'rgba(20, 20, 20, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '10px 0',
      position: 'fixed',
      bottom: bottomOffset,
      left: 0,
      right: 0,
      zIndex: 50,
      transition: 'bottom 0.3s ease'
    }}>
      <NavLink to="/" style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none',
        color: isActive ? '#a855f7' : '#a1a1aa'
      })}>
        <Home size={20} />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>Trang Chủ</span>
      </NavLink>

      <NavLink to="/explore" style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none',
        color: isActive ? '#a855f7' : '#a1a1aa'
      })}>
        <Compass size={20} />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>Khám Phá</span>
      </NavLink>

      <NavLink to="/queue" style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none',
        color: isActive ? '#a855f7' : '#a1a1aa'
      })}>
        <ListVideo size={20} />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>Hàng Đợi</span>
      </NavLink>

      <NavLink to="/history" style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none',
        color: isActive ? '#a855f7' : '#a1a1aa'
      })}>
        <HistoryIcon size={20} />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>Lịch Sử</span>
      </NavLink>

      <NavLink to="/settings" style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none',
        color: isActive ? '#a855f7' : '#a1a1aa'
      })}>
        <Settings size={20} />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>Cài Đặt</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
