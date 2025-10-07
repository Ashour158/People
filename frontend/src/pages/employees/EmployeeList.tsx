import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { employeeApi } from '../../api';

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', paginationModel],
    queryFn: () =>
      employeeApi.getAll({
        page: paginationModel.page + 1,
        perPage: paginationModel.pageSize,
      }),
  });

  const columns: GridColDef[] = [
    { field: 'employee_code', headerName: 'Code', width: 120 },
    { field: 'first_name', headerName: 'First Name', width: 150 },
    { field: 'last_name', headerName: 'Last Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone_number', headerName: 'Phone', width: 150 },
    { field: 'department_name', headerName: 'Department', width: 150 },
    { field: 'designation_name', headerName: 'Designation', width: 150 },
    { field: 'employee_status', headerName: 'Status', width: 120 },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Employees</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/employees/new')}
        >
          Add Employee
        </Button>
      </Box>

      <Paper sx={{ p: 2, height: 600 }}>
        <DataGrid
          rows={data?.data || []}
          columns={columns}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          getRowId={(row) => row.employee_id}
          disableRowSelectionOnClick
        />
      </Paper>
    </Container>
  );
};
