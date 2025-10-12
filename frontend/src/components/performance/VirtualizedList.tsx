import React, { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, Paper, Typography, Avatar, Chip, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';

interface VirtualizedListProps {
  items: any[];
  height: number;
  itemHeight: number;
  onItemClick?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  renderItem?: (item: any) => React.ReactNode;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    onItemClick?: (item: any) => void;
    onEdit?: (item: any) => void;
    onDelete?: (item: any) => void;
    renderItem?: (item: any) => React.ReactNode;
  };
}

const ListItem = memo<ListItemProps>(({ index, style, data }) => {
  const { items, onItemClick, onEdit, onDelete, renderItem } = data;
  const item = items[index];

  if (!item) return null;

  const handleClick = () => onItemClick?.(item);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(item);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item);
  };

  return (
    <div style={style}>
      <Paper
        sx={{
          m: 1,
          p: 2,
          cursor: onItemClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 2,
          },
        }}
        onClick={handleClick}
      >
        {renderItem ? (
          renderItem(item)
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={item.avatar_url}
              sx={{ width: 40, height: 40 }}
            >
              {item.first_name?.[0]}{item.last_name?.[0]}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" noWrap>
                {item.first_name} {item.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {item.job_title || item.position} - {item.department_name || item.department}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {item.status && (
                <Chip
                  label={item.status}
                  size="small"
                  color={item.status === 'active' ? 'success' : 'default'}
                />
              )}
              {onEdit && (
                <IconButton size="small" onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
              )}
              {onDelete && (
                <IconButton size="small" onClick={handleDelete} color="error">
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </div>
  );
});

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  height,
  itemHeight,
  onItemClick,
  onEdit,
  onDelete,
  renderItem,
}) => {
  const itemData = {
    items,
    onItemClick,
    onEdit,
    onDelete,
    renderItem,
  };

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={5}
    >
      {ListItem}
    </List>
  );
};
