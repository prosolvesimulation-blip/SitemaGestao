import React from 'react';
import styled from 'styled-components';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--background);
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${(props) => (props.sidebarOpen ? '260px' : '0')};
  transition: margin-left 0.3s ease;
  
  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const ContentWrapper = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Layout = ({ children, sidebarOpen }) => {
  return (
    <LayoutContainer>
      <MainContent sidebarOpen={sidebarOpen}>
        <ContentWrapper>{children}</ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;