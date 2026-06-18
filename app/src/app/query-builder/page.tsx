'use client';

import { QueryBuilder } from './components/QueryBuilder';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function QueryBuilderPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Export Tool</h1>
        <p className="text-muted-foreground">
          Build custom queries with time-based contextualization of different data sources
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
          <CardDescription>
            This tool allows you to export data with temporal contextualization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Select your primary data source (the main data you want to export)</li>
            <li>Apply filters to narrow down your primary data selection</li>
            <li>Optionally, add a contextualized data source to enrich your data</li>
            <li>
              Configure the time window for your contextualized data (before/after/around your primary data)
            </li>
            <li>Export your results in CSV or JSON format</li>
          </ol>
        </CardContent>
      </Card>

      <Suspense fallback={<LoadingState />}>
        <QueryBuilder />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2 text-lg">Loading query builder...</span>
    </div>
  );
} 