import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePlaces, useCreatePlace, useUpdatePlace, useDeletePlace } from '@/hooks/usePlaces';
import { PLACE_CATEGORIES } from '@/lib/constants';
import type { FavoritePlace } from '@shared/types';
import { useForm, Controller } from 'react-hook-form';

interface PlaceForm {
  name: string; address: string; city: string; state: string; zip: string;
  category: string; notes: string;
}

export function Places() {
  const { data: places = [], isLoading } = usePlaces();
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<FavoritePlace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FavoritePlace | null>(null);

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<PlaceForm>({
    defaultValues: { name: '', address: '', city: '', state: '', zip: '', category: '', notes: '' },
  });

  const openCreate = () => {
    setEditingPlace(null);
    reset({ name: '', address: '', city: '', state: '', zip: '', category: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (place: FavoritePlace) => {
    setEditingPlace(place);
    reset({
      name: place.name,
      address: place.address ?? '',
      city: place.city ?? '',
      state: place.state ?? '',
      zip: place.zip ?? '',
      category: place.category ?? '',
      notes: place.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: PlaceForm) => {
    if (editingPlace) {
      await updatePlace.mutateAsync({ id: editingPlace.id, data: values });
    } else {
      await createPlace.mutateAsync(values);
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deletePlace.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const filtered = places.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const catColors: Record<string, string> = {
    Home: 'bg-green-100 text-green-700',
    Office: 'bg-blue-100 text-blue-700',
    Client: 'bg-purple-100 text-purple-700',
    Government: 'bg-orange-100 text-orange-700',
    Other: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="text-xl font-bold">Favorite Places</h1>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <Input
        placeholder="Search places…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No places found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((place) => (
            <div key={place.id} className="bg-white rounded-xl border p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{place.name}</span>
                  {place.category && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catColors[place.category] ?? catColors.Other}`}>
                      {place.category}
                    </span>
                  )}
                </div>
                {place.address && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {place.address}, {place.city}, {place.state} {place.zip}
                  </p>
                )}
                {place.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{place.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(place)} className="p-2 text-muted-foreground hover:text-gray-700">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(place)} className="p-2 text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlace ? 'Edit Place' : 'Add Place'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input {...register('name', { required: true })} className="mt-1" placeholder="e.g., Home, Client Office" />
            </div>
            <div>
              <Label>Street Address</Label>
              <Input {...register('address')} className="mt-1" placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>City</Label>
                <Input {...register('city')} className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input {...register('state')} className="mt-1" maxLength={2} placeholder="LA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ZIP</Label>
                <Input {...register('zip')} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLACE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input {...register('notes')} className="mt-1" placeholder="Optional notes" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{editingPlace ? 'Save' : 'Add Place'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This place will be removed. Any mileage entries that referenced it will keep the trip data but lose the place link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
