import React from 'react';
import styled from 'styled-components';
import { FaBars, FaBell, FaUser } from 'react-icons/fa';

const HeaderContainer = styled.header`
  background: white;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text);
  cursor: pointer;
  padding: 0.5rem;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
`;

const LogoHeader = styled.img`
  height: 32px;
  width: auto;
  margin-right: 0.75rem;
  display: none;
  
  @media (min-width: 769px) {
    display: block;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const NotificationButton = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  
  &:hover {
    color: var(--text);
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--danger);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
`;

const UserInfo = styled.div`
  display: none;
  
  @media (min-width: 768px) {
    display: block;
  }
  
  span {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  small {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
`;

const Header = ({ title, onMenuClick, notificationCount }) => {
  return (
    <HeaderContainer>
      <LeftSection>
        <MenuButton onClick={onMenuClick}>
          <FaBars />
        </MenuButton>
        <LogoHeader src="/logo.avif" alt="OFFCON" />
        <Title>{title}</Title>
      </LeftSection>
      <RightSection>
        <NotificationButton>
          <FaBell />
          {notificationCount > 0 && <Badge>{notificationCount}</Badge>}
        </NotificationButton>
        <UserSection>
          <UserAvatar>
            <FaUser />
          </UserAvatar>
          <UserInfo>
            <span>Administrador</span>
            <small>Gestor</small>
          </UserInfo>
        </UserSection>
      </RightSection>
    </HeaderContainer>
  );
};

export default Header;