/**
 * Organizational Chart Component
 * Visualizes company hierarchy using D3.js
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  ButtonGroup,
  TextField,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Avatar,
  Chip,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  FitScreen,
  Search,
  Person,
  Download,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department_name?: string;
  manager_id?: string;
  profile_picture?: string;
}

interface OrgNode {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  avatar?: string;
  children?: OrgNode[];
}

const OrganizationalChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  
  const organizationId = localStorage.getItem('organization_id');

  // Fetch employees
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees', organizationId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/employees`, {
        params: { organization_id: organizationId },
      });
      return response.data.data || response.data;
    },
    enabled: !!organizationId,
  });

  // Transform employees into hierarchical structure
  const buildHierarchy = (employees: Employee[]): OrgNode | null => {
    if (!employees || employees.length === 0) return null;

    const employeeMap = new Map<string, OrgNode>();
    const childrenMap = new Map<string, OrgNode[]>();

    // Create nodes
    employees.forEach(emp => {
      const node: OrgNode = {
        id: emp.employee_id,
        name: `${emp.first_name} ${emp.last_name}`,
        title: emp.job_title,
        department: emp.department_name || 'N/A',
        email: emp.email,
        avatar: emp.profile_picture,
        children: [],
      };
      employeeMap.set(emp.employee_id, node);
    });

    // Build parent-child relationships
    employees.forEach(emp => {
      if (emp.manager_id) {
        if (!childrenMap.has(emp.manager_id)) {
          childrenMap.set(emp.manager_id, []);
        }
        const node = employeeMap.get(emp.employee_id);
        if (node) {
          childrenMap.get(emp.manager_id)!.push(node);
        }
      }
    });

    // Assign children to nodes
    childrenMap.forEach((children, managerId) => {
      const manager = employeeMap.get(managerId);
      if (manager) {
        manager.children = children;
      }
    });

    // Find root (employee with no manager)
    const root = employees.find(emp => !emp.manager_id);
    return root ? employeeMap.get(root.employee_id) || null : null;
  };

  const renderOrgChart = (data: OrgNode) => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, 50)`);

    // Create tree layout
    const treeLayout = d3.tree<OrgNode>()
      .size([width - 100, height - 200])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2));

    const root = d3.hierarchy(data);
    treeLayout(root);

    // Draw links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
      )
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', 2);

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        setSelectedNode(d.data);
      });

    // Add circles for nodes
    nodes.append('circle')
      .attr('r', 30)
      .style('fill', '#4CAF50')
      .style('stroke', '#fff')
      .style('stroke-width', 3);

    // Add text labels
    nodes.append('text')
      .attr('dy', 45)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.name)
      .style('font-size', '12px')
      .style('font-weight', 'bold');

    nodes.append('text')
      .attr('dy', 60)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.title)
      .style('font-size', '10px')
      .style('fill', '#666');

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior as any);
  };

  useEffect(() => {
    if (employees && employees.length > 0) {
      const hierarchy = buildHierarchy(employees);
      if (hierarchy) {
        renderOrgChart(hierarchy);
      }
    }
  }, [employees]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, 1.2);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, 0.8);
  };

  const handleFitScreen = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleTo as any, 1);
  };

  const handleExport = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'org-chart.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Organizational Chart
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualize your company hierarchy
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />

          <ButtonGroup variant="outlined" size="small">
            <Tooltip title="Zoom In">
              <Button onClick={handleZoomIn}>
                <ZoomIn />
              </Button>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <Button onClick={handleZoomOut}>
                <ZoomOut />
              </Button>
            </Tooltip>
            <Tooltip title="Fit to Screen">
              <Button onClick={handleFitScreen}>
                <FitScreen />
              </Button>
            </Tooltip>
          </ButtonGroup>

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 200px)' }}>
        <Paper sx={{ flex: 1, p: 2, overflow: 'hidden' }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography>Loading organizational chart...</Typography>
            </Box>
          ) : (
            <svg
              ref={svgRef}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#f5f5f5',
              }}
            />
          )}
        </Paper>

        {selectedNode && (
          <Card sx={{ width: 300 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{ width: 80, height: 80, mb: 2 }}
                  src={selectedNode.avatar}
                >
                  <Person />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {selectedNode.name}
                </Typography>
                <Chip label={selectedNode.title} size="small" sx={{ mb: 1 }} />
                <Chip label={selectedNode.department} size="small" color="primary" />
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Contact
                </Typography>
                <Typography variant="body2">
                  {selectedNode.email}
                </Typography>
              </Box>

              {selectedNode.children && selectedNode.children.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Direct Reports
                  </Typography>
                  <Typography variant="body2">
                    {selectedNode.children.length} employee{selectedNode.children.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Total Employees: {employees?.length || 0} | Zoom: {(zoom * 100).toFixed(0)}%
        </Typography>
      </Box>
    </Container>
  );
};

export default OrganizationalChart;
