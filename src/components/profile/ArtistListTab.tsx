import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';
import { useArtists } from '@/hooks/queries/useArtists';

const ArtistListTab = () => {
  const { data: artists = [], isLoading: loading } = useArtists();
  return (
    <div className="dark:glass-card rounded-lg bg-diamond-100 text-diamond-900 shadow dark:text-foreground">
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-xl font-semibold">Artist List Management</h2>
        <p className="text-muted-foreground">
          Add, edit or remove diamond painting artists from your collection.
        </p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : artists.length > 0 ? (
          <div className="mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist Name</TableHead>
                  <TableHead>View Kits by this Artist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artists.map(artist => (
                  <TableRow key={artist.id}>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell>
                      <Link
                        to={`/dashboard?artist=${encodeURIComponent(artist.name)}`}
                        className="flex items-center text-primary hover:underline"
                      >
                        <Search className="mr-1 h-4 w-4" />
                        View Kits by {artist.name}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="mb-6 py-4 text-center">
            <p className="text-muted-foreground">You haven't added any artists yet.</p>
          </div>
        )}

        <div className="flex justify-center">
          <Link to="/artists">
            <Button>Manage Artists</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArtistListTab;
