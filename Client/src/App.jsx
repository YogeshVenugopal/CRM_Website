import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { queryClient } from './lib/queryClient';

// Feature Views
import { Login } from './features/auth/Login';
import { DashboardView } from './features/dashboard/DashboardView';
import { LeadList } from './features/leads/LeadList';
import { LeadDetail } from './features/leads/LeadDetail';
import { PipelineKanban } from './features/pipeline/PipelineKanban';
import { ClientList } from './features/clients/ClientList';
import { ClientDetail } from './features/clients/ClientDetail';
import { QuotationList } from './features/quotations/QuotationList';
import { QuotationBuilder } from './features/quotations/QuotationBuilder';
import { ProjectList } from './features/projects/ProjectList';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { TaskBoard } from './features/tasks/TaskBoard';
import { InvoiceList } from './features/finance/InvoiceList';
import { InvoiceDetail } from './features/finance/InvoiceDetail';
import { ReportsOverview } from './features/reports/ReportsOverview';

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Login />} />

                {/* Protected Application Routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <Routes>
                          <Route path="/dashboard" element={<DashboardView />} />
                          <Route path="/leads" element={<LeadList />} />
                          <Route path="/leads/:id" element={<LeadDetail />} />
                          <Route path="/pipeline" element={<PipelineKanban />} />
                          <Route path="/clients" element={<ClientList />} />
                          <Route path="/clients/:id" element={<ClientDetail />} />
                          <Route path="/quotations" element={<QuotationList />} />
                          <Route path="/quotations/new" element={<QuotationBuilder />} />
                          <Route path="/projects" element={<ProjectList />} />
                          <Route path="/projects/:id" element={<ProjectDetail />} />
                          <Route path="/tasks" element={<TaskBoard />} />
                          <Route path="/invoices" element={<InvoiceList />} />
                          <Route path="/invoices/:id" element={<InvoiceDetail />} />
                          <Route path="/reports" element={<ReportsOverview />} />
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
