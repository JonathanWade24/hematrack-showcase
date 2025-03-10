"use client";

import QueryBuilder from './QueryBuilder';
import { Card } from '@/components/ui/card';

export default function QueryBuilderWrapper() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Query Builder</h1>
        <p className="text-sm text-muted-foreground">
          Build and execute custom queries against the research database
        </p>
      </div>
      
      <Card className="p-0 overflow-hidden">
        <QueryBuilder />
      </Card>
    </div>
  );
} 