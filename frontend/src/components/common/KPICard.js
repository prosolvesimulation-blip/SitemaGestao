import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const IconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: ${(props) => props.color || 'var(--primary)'};
  color: white;
`;

const Content = styled.div`
  flex: 1;
`;

const Label = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 0.25rem 0;
`;

const Value = styled.h3`
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
`;

const Trend = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${(props) => (props.positive ? 'var(--success)' : 'var(--danger)')};
  margin-top: 0.25rem;
`;

const KPICard = ({ 
  icon: Icon, 
  label, 
  value, 
  color = 'var(--primary)',
  trend,
  trendPositive = true 
}) => {
  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `R$ ${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `R$ ${(val / 1000).toFixed(0)}k`;
      }
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  return (
    <Card>
      <IconWrapper color={color}>
        <Icon />
      </IconWrapper>
      <Content>
        <Label>{label}</Label>
        <Value>{formatValue(value)}</Value>
        {trend && (
          <Trend positive={trendPositive}>
            {trendPositive ? '↑' : '↓'} {trend}
          </Trend>
        )}
      </Content>
    </Card>
  );
};

export default KPICard;