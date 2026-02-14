import React, { useState } from 'react';
import styled from 'styled-components';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaEye } from 'react-icons/fa';

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: var(--background);
  border-bottom: 2px solid var(--border);
  cursor: ${(props) => (props.sortable ? 'pointer' : 'default')};
  user-select: none;
  
  &:hover {
    background: ${(props) => (props.sortable ? '#e2e8f0' : 'var(--background)')};
  }
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  color: var(--text);
`;

const Tr = styled.tr`
  &:hover {
    background: rgba(241, 245, 249, 0.5);
  }
`;

const SortIcon = styled.span`
  margin-left: 0.5rem;
  display: inline-flex;
  align-items: center;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  
  &:hover {
    background: var(--background);
    color: var(--primary);
  }
  
  &.danger:hover {
    color: var(--danger);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--border);
`;

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const PageButtons = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const PageButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  background: ${(props) => (props.active ? 'var(--primary)' : 'white')};
  color: ${(props) => (props.active ? 'white' : 'var(--text)')};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover:not(:disabled) {
    background: ${(props) => (props.active ? 'var(--primary-dark)' : 'var(--background)')};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  onView,
  itemsPerPage = 10,
  emptyMessage = 'Nenhum registro encontrado',
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (column) => {
    if (column.sortable === false) return;
    
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const getSortIcon = (column) => {
    if (sortColumn !== column.key) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item[column.key], item);
    }
    return item[column.key];
  };

  return (
    <TableContainer>
      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <Th
                key={column.key}
                sortable={column.sortable !== false}
                onClick={() => handleSort(column)}
              >
                {column.title}
                {column.sortable !== false && (
                  <SortIcon>{getSortIcon(column)}</SortIcon>
                )}
              </Th>
            ))}
            {(onEdit || onDelete || onView) && <Th>Ações</Th>}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <Tr key={item.id || index}>
                {columns.map((column) => (
                  <Td key={column.key}>{renderCell(item, column)}</Td>
                ))}
                {(onEdit || onDelete || onView) && (
                  <Td>
                    <Actions>
                      {onView && (
                        <ActionButton onClick={() => onView(item)} title="Ver detalhes">
                          <FaEye />
                        </ActionButton>
                      )}
                      {onEdit && (
                        <ActionButton onClick={() => onEdit(item)} title="Editar">
                          <FaEdit />
                        </ActionButton>
                      )}
                      {onDelete && (
                        <ActionButton
                          className="danger"
                          onClick={() => onDelete(item)}
                          title="Excluir"
                        >
                          <FaTrash />
                        </ActionButton>
                      )}
                    </Actions>
                  </Td>
                )}
              </Tr>
            ))
          ) : (
            <tr>
              <Td colSpan={columns.length + (onEdit || onDelete || onView ? 1 : 0)}>
                <EmptyState>{emptyMessage}</EmptyState>
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
      
      {totalPages > 1 && (
        <Pagination>
          <PageInfo>
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedData.length)} de{' '}
            {sortedData.length} registros
          </PageInfo>
          <PageButtons>
            <PageButton
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </PageButton>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PageButton
                key={page}
                active={currentPage === page}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </PageButton>
            ))}
            <PageButton
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próxima
            </PageButton>
          </PageButtons>
        </Pagination>
      )}
    </TableContainer>
  );
};

export default DataTable;