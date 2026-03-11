import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Loader2, Car, Clock, Gauge, MapPin } from 'lucide-react';
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
import { useCreateMileage, useUpdateMileage, useDeleteMileage, useCalculateDistance, useRecentTrips } from '@/hooks/useMileage';
import { ENTITIES, BUSINESS_PURPOSES, PLACE_ENTITY_DEFAULTS } from '@shared/types';
import { todayISODate, hrMinToDecimal } from '@/lib/utils';
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
  odometerReading: string;
  entity: string;
  entityOther: string;
  // Business purpose (dropdown for LH / LP / AJL; free text for others)
  businessPurpose: string;
  businessPurposeOther: string;
  description: string; // Used only when entity has no BUSINESS_PURPOSES entry
  notes: string;
  // Time spent at destination
  timeAtLocationHours: string;
  timeAtLocationMinutes: string;
}

export function LogMiles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: places = [] } = usePlaces();
  const { data: recentTrips = [] } = useRecentTrips();
  const createMileage = useCreateMileage();
  const updateMileage = useUpdateMileage();
  const deleteMileage = useDeleteMileage();
  const calcDistance = useCalculateDistance();

  const [calcStatus, setCalcStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  // Stores the one-way distance from the API so round-trip toggle can re-apply the multiplier
  const [baseOnewayMiles, setBaseOnewayMiles] = useState<number | null>(null);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      date: todayISODate(), fromPlaceId: '', fromAddress: '',
      toPlaceId: '', toAddress: '', actualMiles: '', isRoundTrip: false,
      odometerReading: '',
      entity: '', entityOther: '',
      businessPurpose: '', businessPurposeOther: '', description: '',
      notes: '',
      timeAtLocationHours: '0', timeAtLocationMinutes: '0',
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
            // Seed base one-way miles so the round-trip toggle works in edit mode
            if (entry.calculatedMiles != null) setBaseOnewayMiles(entry.calculatedMiles);

            // Determine how to populate description / businessPurpose
            const loadedEntity: string = entry.entity;
            const purposes = BUSINESS_PURPOSES[loadedEntity];
            let businessPurpose = '';
            let businessPurposeOther = '';
            let description = '';

            if (purposes) {
              if ((purposes as readonly string[]).includes(entry.description)) {
                businessPurpose = entry.description;
              } else {
                // Stored description doesn't match known purposes — treat as "Other"
                businessPurpose = 'Other';
                businessPurposeOther = entry.description;
              }
            } else {
              description = entry.description;
            }

            reset({
              date: entry.date.slice(0, 10),
              fromPlaceId: entry.fromPlaceId || '',
              fromAddress: entry.fromAddress || '',
              toPlaceId: entry.toPlaceId || '',
              toAddress: entry.toAddress || '',
              actualMiles: String(entry.actualMiles),
              isRoundTrip: entry.isRoundTrip,
              odometerReading: entry.odometerReading != null ? String(entry.odometerReading) : '',
              entity: entry.entity,
              entityOther: entry.entityOther || '',
              businessPurpose,
              businessPurposeOther,
              description,
              notes: entry.notes || '',
              timeAtLocationHours: '0',
              timeAtLocationMinutes: '0',
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
  const businessPurpose = watch('businessPurpose');
  const timeAtLocationHours = watch('timeAtLocationHours');
  const timeAtLocationMinutes = watch('timeAtLocationMinutes');

  // Purposes list for the selected entity (undefined = use free-text description)
  const purposeOptions = entity ? BUSINESS_PURPOSES[entity] : undefined;

  const estimatedDriveMinutes = (() => {
    const m = parseFloat(actualMilesVal);
    if (!m || m <= 0) return null;
    return Math.round((m / AVG_SPEED_MPH) * 60);
  })();

  const timeAtLocationDecimal = hrMinToDecimal(
    parseInt(timeAtLocationHours) || 0,
    parseInt(timeAtLocationMinutes) || 0,
  );

  // Auto-calculate distance when From/To change
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
        setBaseOnewayMiles(data.miles);
        const miles = isRoundTrip ? data.miles * 2 : data.miles;
        setValue('actualMiles', miles.toFixed(1));
        setCalcStatus('done');
      },
      onError: () => setCalcStatus('error'),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPlaceId, toPlaceId, fromAddress, toAddress]);

  // When the round-trip toggle changes, re-apply the multiplier using the stored one-way distance
  useEffect(() => {
    if (baseOnewayMiles === null) return;
    const miles = isRoundTrip ? baseOnewayMiles * 2 : baseOnewayMiles;
    setValue('actualMiles', miles.toFixed(1));
  }, [isRoundTrip, baseOnewayMiles, setValue]);

  // Auto-populate entity when destination place changes (#2)
  useEffect(() => {
    if (!toPlaceId) return;
    const place = places.find((p) => p.id === toPlaceId);
    if (!place) return;
    for (const { contains, entity: defaultEntity } of PLACE_ENTITY_DEFAULTS) {
      if (place.name.toLowerCase().includes(contains.toLowerCase())) {
        setValue('entity', defaultEntity);
        // Reset business purpose so user re-selects for the new entity
        setValue('businessPurpose', '');
        setValue('businessPurposeOther', '');
        break;
      }
    }
  }, [toPlaceId, places, setValue]);

  // Reset business purpose when entity changes to avoid stale selection
  useEffect(() => {
    if (!isEdit) {
      setValue('businessPurpose', '');
      setValue('businessPurposeOther', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, setValue]);

  const onSubmit = async (values: FormValues) => {
    // Build the description from the business purpose dropdown (if applicable) or free text
    const descriptionValue = purposeOptions
      ? (values.businessPurpose === 'Other' ? values.businessPurposeOther : values.businessPurpose)
      : values.description;

    if (!descriptionValue) return; // validation should catch this first

    const timeAtLocation = timeAtLocationDecimal > 0 ? timeAtLocationDecimal : null;

    const payload = {
      date: values.date,
      fromPlaceId: values.fromPlaceId || null,
      fromAddress: values.fromAddress || null,
      toPlaceId: values.toPlaceId || null,
      toAddress: values.toAddress || null,
      actualMiles: parseFloat(values.actualMiles) || 0,
      isRoundTrip: values.isRoundTrip,
      odometerReading: values.odometerReading ? parseFloat(values.odometerReading) : null,
      entity: values.entity,
      entityOther: values.entityOther || null,
      description: descriptionValue,
      notes: values.notes || null,
      timeAtLocation,
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
    // Re-populate business purpose / description from the trip
    const tripPurposes = BUSINESS_PURPOSES[trip.entity];
    if (tripPurposes && (tripPurposes as readonly string[]).includes(trip.description)) {
      setValue('businessPurpose', trip.description);
    } else if (tripPurposes) {
      setValue('businessPurpose', 'Other');
      setValue('businessPurposeOther', trip.description);
    } else {
      setValue('description', trip.description);
    }
  };

  const placeLabel = (p: FavoritePlace) => `${p.name} — ${p.city}, ${p.state}`;

  const isBusinessTrip = entity && entity !== 'Personal';

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
                  This will also delete the auto-logged travel hours entry for this trip. This action cannot be undone.
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

        {/* Odometer Reading (#1) */}
        <div>
          <Label>
            Odometer Reading <span className="text-muted-foreground font-normal">(optional — for reconciliation)</span>
          </Label>
          <div className="relative mt-1">
            <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="number"
              step="1"
              min="0"
              placeholder="e.g. 48235"
              {...register('odometerReading')}
              className="pl-9"
            />
          </div>
        </div>

        {/* Entity / Purpose */}
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

        {/* Business Purpose — dropdown for LH/LP/AJL (#3); free text for others */}
        {entity && (
          <div>
            <Label>
              Business Purpose <span className="text-muted-foreground font-normal">(IRS required)</span>
            </Label>

            {purposeOptions ? (
              // Entity-specific dropdown
              <>
                <Controller
                  control={control}
                  name="businessPurpose"
                  rules={{ required: 'Please select a business purpose' }}
                  render={({ field }) => (
                    <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select purpose…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Select purpose —</SelectItem>
                        {purposeOptions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.businessPurpose && <p className="text-xs text-destructive mt-1">{errors.businessPurpose.message}</p>}
                {businessPurpose === 'Other' && (
                  <Input
                    placeholder="Describe the business purpose…"
                    {...register('businessPurposeOther', { required: businessPurpose === 'Other' ? 'Please describe the purpose' : false })}
                    className="mt-1"
                  />
                )}
                {errors.businessPurposeOther && <p className="text-xs text-destructive mt-1">{errors.businessPurposeOther.message}</p>}
              </>
            ) : (
              // Free-text description for other entities
              <>
                <Textarea
                  placeholder="e.g., Showed house to buyer, Picked up keys from title company…"
                  {...register('description', { required: !purposeOptions ? 'Description is required for IRS compliance' : false })}
                  className="mt-1"
                  rows={2}
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
              </>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input placeholder="Any additional notes…" {...register('notes')} className="mt-1" />
        </div>

        {/* Auto-log banner + Time at Location (#3/#5) */}
        {isBusinessTrip && !isEdit && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700 space-y-3">
            {/* Travel time auto-log notice */}
            <div className="space-y-1">
              <div>
                <Car className="inline h-3.5 w-3.5 mr-1" />
                A travel hours entry will be auto-logged for this business trip.
              </div>
              {estimatedDriveMinutes !== null && (
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  Estimated drive time: ~{estimatedDriveMinutes} min
                  {estimatedDriveMinutes >= 60 && (
                    <span className="text-purple-500 font-normal">
                      ({Math.floor(estimatedDriveMinutes / 60)}h {estimatedDriveMinutes % 60}m)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Time at location (#5) */}
            <div className="border-t border-purple-200 pt-3 space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-purple-800">
                <MapPin className="h-3.5 w-3.5" />
                Time Spent at Destination
                <span className="text-purple-500 font-normal">(optional)</span>
              </div>
              <p className="text-purple-600">Also auto-log hours spent at the location.</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    {...register('timeAtLocationHours', { min: 0 })}
                    className="text-center font-semibold bg-white border-purple-300 text-purple-900"
                  />
                  <span className="text-purple-600 shrink-0 text-xs">hr</span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    {...register('timeAtLocationMinutes', { min: 0, max: 59 })}
                    className="text-center font-semibold bg-white border-purple-300 text-purple-900"
                  />
                  <span className="text-purple-600 shrink-0 text-xs">min</span>
                </div>
              </div>
              {timeAtLocationDecimal > 0 && (
                <p className="text-purple-600 font-medium">
                  Will log {timeAtLocationDecimal.toFixed(2)} hr at location
                </p>
              )}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : (isEdit ? 'Save Changes' : 'Log Trip')}
        </Button>
      </form>
    </div>
  );
}
