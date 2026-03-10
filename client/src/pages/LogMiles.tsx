import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, ArrowRight, RotateCcw, Loader2, Car, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntityBadge } from '@/components/EntityBadge';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePlaces } from '@/hooks/usePlaces';
import { useMileage, useCreateMileage, useUpdateMileage, useDeleteMileage, useCalculateDistance, useRecentTrips } from '@/hooks/useMileage';
import { ENTITIES } from '@/lib/constants';
import { todayISODate } from '@/lib/utils';
import { AVG_SPEED_MPH } from '@shared/types';
import type { FavoritePlace } from '@shared/types';

interface FormValues {
  date: string;
  fromPlaceId: string;
  fromAddress: string;
  toPlaceId: string;
  toAddress: string;
  actualMiles: string;
  isRoundTrip: boolean;
  entity: string;
  entityOther: string;
  description: string;
  notes: string;
}

export function LogMiles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: places = [] } = usePlaces();
  const { data: recentTrips = [] } = useRecentTrips();
  const { data: editData } = useMileage(isEdit ? undefined : undefined);
  const createMileage = useCreateMileage();
  const updateMileage = useUpdateMileage();
  const deleteMileage = useDeleteMileage();
  const calcDistance = useCalculateDistance();

  const [calcStatus, setCalcStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      date: todayISODate(), fromPlaceId: '', fromAddress: '',
      toPlaceId: '', toAddress: '', actualMiles: '', isRoundTrip: false,
      entity: '', entityOther: '', description: '', notes: '',
    },
  });

  // Load edit data
  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/mileage?limit=1000`, { headers: { Authorization: `Bearer ${localStorage.getItem('realtaylor_token')}` } })
        .then((r) => r.json())
        .then((entries) => {
          const entry = entries.find((e: any) => e.id === id);
          if (entry) {
            reset({
              date: entry.date.slice(0, 10),
              fromPlaceId: entry.fromPlaceId || '',
              fromAddress: entry.fromAddress || '',
              toPlaceId: entry.toPlaceId || '',
              toAddress: entry.toAddress || '',
              actualMiles: String(entry.actualMiles),
              isRoundTrip: entry.isRoundTrip,
              entity: entry.entity,
              entityOther: entry.entityOther || '',
              description: entry.description,
              notes: entry.notes || '',
            });
          }
        });
    }
  }, [id, isEdit, reset]);

  const fromPlaceId = watch('fromPlaceId');
  const toPlaceId = watch('toPlaceId');
  const fromAddress = watch('fromAddress');
  const toAddress = watch('toAddress');
  const isRoundTrip = watch('isRoundTrip');
  const entity = watch('entity');
  const actualMilesVal = watch('actualMiles');

  const estimatedMinutes = (() => {
    const m = parseFloat(actualMilesVal);
    if (!m || m <= 0) return null;
    return Math.round((m / AVG_SPEED_MPH) * 60);
  })();

  // Auto-calculate distance
  useEffect(() => {
    const getAddr = (placeId: string, customAddr: string): string | null => {
      if (placeId) {
        const p = places.find((pl) => pl.id === placeId);
        if (p) return `${p.address}, ${p.city}, ${p.state} ${p.zip}`;
      }
      return customAddr || null;
    };
    const from = getAddr(fromPlaceId, fromAddress);
    const to = getAddr(toPlaceId, toAddress);
    if (!from || !to) return;

    setCalcStatus('loading');
    calcDistance.mutate({ fromAddress: from, toAddress: to }, {
      onSuccess: (data) => {
        const miles = isRoundTrip ? data.miles * 2 : data.miles;
        setValue('actualMiles', miles.toFixed(1));
        setCalcStatus('done');
      },
      onError: () => setCalcStatus('error'),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPlaceId, toPlaceId, fromAddress, toAddress]);

  useEffect(() => {
    const miles = parseFloat(watch('actualMiles'));
    if (!isNaN(miles)) {
      // Recalculate for round trip toggle
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoundTrip]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      actualMiles: parseFloat(values.actualMiles) || 0,
      fromPlaceId: values.fromPlaceId || null,
      fromAddress: values.fromAddress || null,
      toPlaceId: values.toPlaceId || null,
      toAddress: values.toAddress || null,
      entityOther: values.entityOther || null,
      notes: values.notes || null,
    };
    if (isEdit && id) {
      await updateMileage.mutateAsync({ id, data: payload });
    } else {
      await createMileage.mutateAsync(payload);
    }
    navigate('/');
  };

  const handleDelete = async () => {
    if (id) {
      await deleteMileage.mutateAsync(id);
      navigate('/');
    }
  };

  const applyRecentTrip = (trip: any) => {
    setValue('fromPlaceId', trip.fromPlaceId || '');
    setValue('fromAddress', trip.fromAddress || '');
    setValue('toPlaceId', trip.toPlaceId || '');
    setValue('toAddress', trip.toAddress || '');
    setValue('entity', trip.entity);
    setValue('description', trip.description);
  };

  const placeLabel = (p: FavoritePlace) => `${p.name} — ${p.city}, ${p.state}`;

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">{isEdit ? 'Edit Trip' : 'Log Miles'}</h1>
        {isEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="ml-auto">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will also delete the auto-logged hours entry for this trip. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Recent trips */}
      {!isEdit && recentTrips.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground font-medium mb-2">Recent trips</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => applyRecentTrip(trip)}
                className="shrink-0 bg-white border rounded-lg px-3 py-2 text-left text-xs shadow-sm hover:border-primary transition-colors"
              >
                <div className="font-medium text-gray-700">
                  {trip.fromPlace?.name ?? trip.fromAddress ?? '?'} <ArrowRight className="inline h-3 w-3" /> {trip.toPlace?.name ?? trip.toAddress ?? '?'}
                </div>
                <EntityBadge entity={trip.entity} />
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('date', { required: true })} className="mt-1" />
        </div>

        {/* From */}
        <div>
          <Label>From</Label>
          <Controller
            control={control}
            name="fromPlaceId"
            render={({ field }) => (
              <Select value={field.value || '__none__'} onValueChange={(v) => { field.onChange(v === '__none__' ? '' : v); setValue('fromAddress', ''); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a place…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— One-time address —</SelectItem>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{placeLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {!fromPlaceId && (
            <Controller
              control={control}
              name="fromAddress"
              render={({ field }) => (
                <AddressAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Or type address…"
                  className="mt-1"
                />
              )}
            />
          )}
        </div>

        {/* To */}
        <div>
          <Label>To</Label>
          <Controller
            control={control}
            name="toPlaceId"
            render={({ field }) => (
              <Select value={field.value || '__none__'} onValueChange={(v) => { field.onChange(v === '__none__' ? '' : v); setValue('toAddress', ''); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a place…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— One-time address —</SelectItem>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{placeLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {!toPlaceId && (
            <Controller
              control={control}
              name="toAddress"
              render={({ field }) => (
                <AddressAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Or type address…"
                  className="mt-1"
                />
              )}
            />
          )}
        </div>

        {/* Miles */}
        <div>
          <div className="flex items-center justify-between">
            <Label>Miles</Label>
            {calcStatus === 'loading' && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Calculating…</span>}
            {calcStatus === 'done' && <span className="text-xs text-green-600">Auto-calculated</span>}
            {calcStatus === 'error' && <span className="text-xs text-amber-600">Calc failed — enter manually</span>}
          </div>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            {...register('actualMiles', { required: 'Miles are required', min: 0.1 })}
            className="mt-1"
          />
          {errors.actualMiles && <p className="text-xs text-destructive mt-1">{errors.actualMiles.message}</p>}
        </div>

        {/* Round trip */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <div>
            <div className="font-medium text-sm">Round Trip</div>
            <div className="text-xs text-muted-foreground">Doubles the logged miles</div>
          </div>
          <Controller
            control={control}
            name="isRoundTrip"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Entity */}
        <div>
          <Label>Purpose / Entity</Label>
          <Controller
            control={control}
            name="entity"
            rules={{ required: 'Please select a purpose' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select purpose…" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.entity && <p className="text-xs text-destructive mt-1">{errors.entity.message}</p>}
          {entity === 'Other' && (
            <Input placeholder="Describe…" {...register('entityOther')} className="mt-1" />
          )}
        </div>

        {/* Description */}
        <div>
          <Label>Business Purpose <span className="text-muted-foreground font-normal">(IRS required)</span></Label>
          <Textarea
            placeholder="e.g., Showed house to buyer, Picked up keys from title company…"
            {...register('description', { required: 'Description is required for IRS compliance' })}
            className="mt-1"
            rows={2}
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        {/* Notes */}
        <div>
          <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input placeholder="Any additional notes…" {...register('notes')} className="mt-1" />
        </div>

        {entity && entity !== 'Personal' && !isEdit && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700 space-y-1">
            <div>
              <Car className="inline h-3.5 w-3.5 mr-1" />
              A travel hours entry will be auto-logged for this business trip.
            </div>
            {estimatedMinutes !== null && (
              <div className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5" />
                Estimated drive time: ~{estimatedMinutes} min
                {estimatedMinutes >= 60 && (
                  <span className="text-purple-500 font-normal">
                    ({Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}m)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : (isEdit ? 'Save Changes' : 'Log Trip')}
        </Button>
      </form>
    </div>
  );
}
