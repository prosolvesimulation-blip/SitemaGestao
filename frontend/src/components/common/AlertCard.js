import React from 'react';
import styled from 'styled-components';
import { FaExclamationTriangle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

const AlertContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background: ${(props) => {
    switch (props.type) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.1)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.1)';
      case 'info':
        return 'rgba(59, 130, 246, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  }};
  border-left: 4px solid ${(props) => {
    switch (props.type) {
      case 'danger':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      case 'info':
        return 'var(--info)';
      default:
        return 'var(--secondary)';
    }
  }};
`;

const IconWrapper = styled.div`
  font-size: 1.25rem;
  color: ${(props) => {
    switch (props.type) {
      case 'danger':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      case 'info':
        return 'var(--info)';
      default:
        return 'var(--secondary)';
    }
  }};
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--text);
`;

const Message = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const AlertCard = ({ type = 'info', title, message, categoria, data, valor }) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return FaExclamationCircle;
      case 'warning':
        return FaExclamationTriangle;
      case 'info':
      default:
        return FaInfoCircle;
    }
  };

  const Icon = getIcon();

  return (
    <AlertContainer type={type}>
      <IconWrapper type={type}>
        <Icon />
      </IconWrapper>
      <Content>
        {title && <Title>{title}</Title>}
        <Message>{message}</Message>
        {(categoria || data || valor) && (
          <Meta>
            {categoria && <span>{categoria}</span>}
            {data && <span>{new Date(data).toLocaleDateString('pt-BR')}</span>}
            {valor && <span>R$ {valor.toLocaleString('pt-BR')}</span>}
          </Meta>
        )}
      </Content>
    </AlertContainer>
  );
};

export default AlertCard;