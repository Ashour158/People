import React, { memo } from 'react';
import { Box, Paper, Typography, Avatar, Chip, IconButton } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';

interface VirtualizedListProps {
  items: any[];
  height: number;
  itemHeight: number;
  onItemClick?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  renderItem?: (item: any) => React.ReactNode;
}

interface ListItemProps {
  item: any;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  onClick?: (item: any) => void;
}

const ListItemComponent: React.FC<ListItemProps> = memo(({
  item,
  onEdit,
  onDelete,
  onView,
  onClick
}) => {
  const handleClick = () => onClick?.(item);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(item);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item);
  };
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView?.(item);
  };

  return (
    <Paper
      sx={{
        m: 1,
        p: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
      }}
      onClick={handleClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 40, height: 40 }}>
          {item.name?.charAt(0) || item.title?.charAt(0) || '?'}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {item.name || item.title || 'Unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.description || item.email || 'No description'}
          </Typography>
          {item.status && (
            <Chip
              label={item.status}
              size="small"
              color={item.status === 'active' ? 'success' : 'default'}
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onView && (
            <IconButton size="small" onClick={handleView}>
              <ViewIcon />
            </IconButton>
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
    </Paper>
  );
});

const VirtualizedList: React.FC<VirtualizedListProps> = memo(({
  items,
  height,
  itemHeight,
  onItemClick,
  onEdit,
  onDelete,
  onView,
  renderItem
}) => {
  // Simple scrollable list without virtualization for now
  return (
    <Box sx={{ height, overflow: 'auto' }}>
      {items.map((item, index) => (
        <ListItemComponent
          key={item.id || index}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onClick={onItemClick}
        />
      ))}
    </Box>
  );
});

export default VirtualizedList;
