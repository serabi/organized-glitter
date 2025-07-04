import React, { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileInput, UploadCloud, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMetadata } from '@/contexts/MetadataContext';
import { useProjectImport } from '@/hooks/useProjectImport';
import { downloadCSVTemplate } from '@/utils/csvTemplateGenerator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Import = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { isLoading } = useMetadata();
  const metadataLoading = isLoading.companies || isLoading.artists || isLoading.tags;
  const { importProjectsFromCSV, loading, progress, importStats } = useProjectImport();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setImportComplete(false);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const success = await importProjectsFromCSV(file);
      if (success) {
        setImportComplete(true);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Import Projects</h1>
            <Button variant="outline" asChild>
              <Link to="/profile">Back to Settings</Link>
            </Button>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>CSV Import Instructions</CardTitle>
              <CardDescription>
                Follow these steps to import your diamond painting projects. The CSV parser can
                handle large files efficiently with real-time progress tracking. You can also try{' '}
                <a
                  href="https://csv.organizedglitter.app"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                >
                  our Diamond Art Club CSV converter
                </a>{' '}
                to convert your DAC order export CSV to a format that can then be imported into
                Organized Glitter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-lg font-medium">Step 1: Prepare Your CSV File</h3>
                  <p className="mb-2 text-muted-foreground">
                    Your CSV file should include the following columns:
                  </p>
                  <div className="overflow-x-auto rounded-md bg-muted p-3">
                    <code className="text-sm">
                      Title, Company, Artist, Width, Height, Source URL, Drill Shape, Total
                      Diamonds, Type of Kit, Status, Date Purchased, Date Received, Date Started,
                      Date Completed, General Notes, Tags
                    </code>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Note: The "General Notes" column is for general notes about the kit, not
                    progress notes. At this time, it is not possible to import progress notes.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-medium">Step 2: Format Requirements</h3>
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    <li>
                      <strong>Title</strong> - Required field
                    </li>
                    <li>
                      <strong>Status</strong> - Must be one of: wishlist, purchased, stash,
                      progress, completed, archived, destashed
                    </li>
                    <li>
                      <strong>Type of Kit</strong> - Must be one of: mini or full
                    </li>
                    <li>
                      <strong>Width & Height</strong> - In centimeters (cm). These should be numeric
                      values - you can use decimals
                    </li>
                    <li>
                      <strong>Dates</strong> - Should be in YYYY-MM-DD format
                    </li>
                    <li>
                      <strong>Tags</strong> - Separate multiple tags with semicolons (e.g.,
                      "Fantasy; Nature; Abstract"). Tag names can be up to 100 characters long.
                    </li>
                    <li>
                      <strong>File Size</strong> - Maximum 10MB
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-medium">Step 3: Sample Template</h3>
                  <p className="mb-3 text-muted-foreground">
                    Download a template to see the correct format:
                  </p>
                  <Button variant="outline" className="mb-4" onClick={handleDownloadTemplate}>
                    <FileInput className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>

                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Example Data in CSV:
                  </h4>
                  <div className="custom-scrollbar block overflow-x-auto rounded-md bg-muted">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-2 text-left font-medium">Title</th>
                          <th className="p-2 text-left font-medium">Company</th>
                          <th className="p-2 text-left font-medium">Artist</th>
                          <th className="p-2 text-left font-medium">Width</th>
                          <th className="p-2 text-left font-medium">Height</th>
                          <th className="p-2 text-left font-medium">Source URL</th>
                          <th className="p-2 text-left font-medium">Drill Shape</th>
                          <th className="p-2 text-left font-medium">Total Diamonds</th>
                          <th className="p-2 text-left font-medium">Type of Kit</th>
                          <th className="p-2 text-left font-medium">Status</th>
                          <th className="p-2 text-left font-medium">Date Purchased</th>
                          <th className="p-2 text-left font-medium">Date Received</th>
                          <th className="p-2 text-left font-medium">Date Started</th>
                          <th className="p-2 text-left font-medium">Date Completed</th>
                          <th className="p-2 text-left font-medium">General Notes</th>
                          <th className="p-2 text-left font-medium">Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="p-2">Purple Sunset</td>
                          <td className="p-2">Diamond Art Club</td>
                          <td className="p-2">Jane Smith</td>
                          <td className="p-2">16</td>
                          <td className="p-2">20</td>
                          <td className="p-2">https://example.com/purple-sunset</td>
                          <td className="p-2">round</td>
                          <td className="p-2">45,250</td>
                          <td className="p-2">full</td>
                          <td className="p-2">progress</td>
                          <td className="p-2">2023-01-15</td>
                          <td className="p-2">2023-01-20</td>
                          <td className="p-2">2023-02-01</td>
                          <td className="p-2">-</td>
                          <td className="p-2">Beautiful landscape</td>
                          <td className="p-2">Fantasy; Nature</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2">Cat Portrait</td>
                          <td className="p-2">Dreamer Designs</td>
                          <td className="p-2">John Doe</td>
                          <td className="p-2">12</td>
                          <td className="p-2">12</td>
                          <td className="p-2">https://example.com/cat-portrait</td>
                          <td className="p-2">square</td>
                          <td className="p-2">8,400</td>
                          <td className="p-2">mini</td>
                          <td className="p-2">completed</td>
                          <td className="p-2">2022-11-10</td>
                          <td className="p-2">2022-11-12</td>
                          <td className="p-2">2022-11-15</td>
                          <td className="p-2">2022-12-20</td>
                          <td className="p-2">Christmas gift</td>
                          <td className="p-2">Animals; Portrait</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2">Ocean Waves</td>
                          <td className="p-2">Artdot</td>
                          <td className="p-2">Sarah Lee</td>
                          <td className="p-2">25.5</td>
                          <td className="p-2">30.8</td>
                          <td className="p-2">https://example.com/ocean-waves</td>
                          <td className="p-2">round</td>
                          <td className="p-2">122,500</td>
                          <td className="p-2">mini</td>
                          <td className="p-2">stash</td>
                          <td className="p-2">2024-03-10</td>
                          <td className="p-2">2024-03-15</td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                          <td className="p-2">Waiting for better lighting</td>
                          <td className="p-2">Ocean; Blue; Peaceful</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2">Mountain Vista</td>
                          <td className="p-2">Paint With Diamonds</td>
                          <td className="p-2">Mike Chen</td>
                          <td className="p-2">40</td>
                          <td className="p-2">50</td>
                          <td className="p-2">https://example.com/mountain-vista</td>
                          <td className="p-2">square</td>
                          <td className="p-2">275,000</td>
                          <td className="p-2">full</td>
                          <td className="p-2">purchased</td>
                          <td className="p-2">2024-05-10</td>
                          <td className="p-2">2024-05-15</td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                          <td className="p-2">Large project for living room</td>
                          <td className="p-2">Landscape; Mountains</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="p-2">Tiny Flowers</td>
                          <td className="p-2">Diamond Dotz</td>
                          <td className="p-2">Amy Wilson</td>
                          <td className="p-2">6</td>
                          <td className="p-2">8</td>
                          <td className="p-2">https://example.com/tiny-flowers</td>
                          <td className="p-2">round</td>
                          <td className="p-2">1,250</td>
                          <td className="p-2">mini</td>
                          <td className="p-2">completed</td>
                          <td className="p-2">2024-01-05</td>
                          <td className="p-2">2024-01-08</td>
                          <td className="p-2">2024-01-10</td>
                          <td className="p-2">2024-01-12</td>
                          <td className="p-2">Quick weekend project</td>
                          <td className="p-2">Flowers; Quick</td>
                        </tr>
                        <tr>
                          <td className="p-2">Abstract Mandala</td>
                          <td className="p-2">Heartful Diamonds</td>
                          <td className="p-2">Lisa Brown</td>
                          <td className="p-2">20</td>
                          <td className="p-2">20</td>
                          <td className="p-2">https://example.com/abstract-mandala</td>
                          <td className="p-2">round</td>
                          <td className="p-2">52,800</td>
                          <td className="p-2">full</td>
                          <td className="p-2">wishlist</td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                          <td className="p-2">Perfect for meditation room</td>
                          <td className="p-2">Abstract; Mandala; Spiritual</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-medium">Step 4: Upload Your File</h3>
                  <p className="mb-4 text-muted-foreground">
                    Select your CSV file and click import to add your projects.
                  </p>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="file"
                        accept=".csv"
                        id="csvFile"
                        className="hidden"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || isUploading}
                      >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Select CSV File
                      </Button>

                      <Button
                        onClick={handleImport}
                        disabled={!file || loading || isUploading || metadataLoading}
                      >
                        <FileInput className="mr-2 h-4 w-4" />
                        Import Projects
                      </Button>
                    </div>

                    {file && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Selected file: <span className="font-medium">{file.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Size:{' '}
                          {file.size > 1024 * 1024
                            ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                            : `${(file.size / 1024).toFixed(2)} KB`}
                          {file.size > 1024 * 1024 &&
                            ' (Large file - using optimized streaming parser)'}
                        </p>
                      </div>
                    )}

                    {(loading || isUploading) && (
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2 w-full" />
                        <p className="text-sm text-muted-foreground">
                          Importing projects... {progress}%
                        </p>
                        {importStats.currentProject && (
                          <p className="text-xs italic text-muted-foreground">
                            Currently importing: {importStats.currentProject}
                          </p>
                        )}
                      </div>
                    )}

                    {importComplete && importStats.successful > 0 && (
                      <Alert
                        variant="default"
                        className="border-green-200 bg-green-50 shadow-sm dark:border-green-800 dark:bg-green-950"
                      >
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-green-600 dark:text-green-400">
                          Import completed successfully!
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p className="mb-2">
                            Successfully imported {importStats.successful} project
                            {importStats.successful !== 1 ? 's' : ''}.
                            {importStats.failed > 0 &&
                              ` Failed to import ${importStats.failed} project${importStats.failed !== 1 ? 's' : ''}.`}
                          </p>
                          <Button variant="default" size="sm" asChild className="mt-2">
                            <Link to="/dashboard" className="flex items-center">
                              Go to your dashboard <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {importStats.failed > 0 && importStats.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Import errors</AlertTitle>
                        <AlertDescription>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {importStats.errors.slice(0, 5).map((error, index) => (
                              <li key={index} className="text-sm">
                                {error}
                              </li>
                            ))}
                            {importStats.errors.length > 5 && (
                              <li className="text-sm">
                                ...and {importStats.errors.length - 5} more errors
                              </li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Import;
