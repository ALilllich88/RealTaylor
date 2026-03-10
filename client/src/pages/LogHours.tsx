import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Loader2, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCreateHours, useUpdateHours, useDeleteHours } from '@/hooks/useHours';
import { HOUR_ENTITIES, ACTIVITY_TYPES } from '@/lib/constants';
import { todayISODate, hrMinToDecimal, decimalToHrMin } from '@/lib/utils';

interface FormValues {
  date: string;
  entity: string;
  entityOther: string;
  activityType: string;
  activityOther: string;
  hours: string;
  minutes: string;
  description: string;
  notes: string;
}

export function LogHours() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [isAutoLogged, setIsAutoLogged] = useState(false);

  const createHours = useCreateHours();
  const updateHours = useUpdateHours();
  const deleteHours = useDeleteHours();

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      date: todayISODate(), entity: '', entityOther: '',
      activityType: '', activityOther: '', hours: '0', minutes: '0',
      description: '', notes: '',
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/hours?limit=1000`, { headers: { Authorization: `Bearer ${localStorage.getItem('realtaylor_token')}` } })
        .then((r) => r.json())
        .then((entries) => {
          const entry = entries.find((e: any) => e.id === id);
          if (entry) {
            const { hr, min } = decimalToHrMin(entry.hours);
            setIsAutoLogged(entry.isAutoLogged);
            reset({
              date: entry.date.slice(0, 10),
              entity: entry.entity,
              entityOther: entry.entityOther || '',
              activityType: entry.activityType,
              activityOther: entry.activityOther || '',
              hours: String(hr),
              minutes: String(min),
              description: entry.description,
              notes: entry.notes || '',
            });
          }
        });
    }
  }, [id, isEdit, reset]);

  const entity = watch('entity');
  const activityType = watch('activityType');

  const onSubmit = async (values: FormValues) => {
    const decimalHours = hrMinToDecimal(parseInt(values.hours) || 0, parseInt(values.minutes) || 0);
    const payload = {
      date: values.date,
      entity: values.entity,
      entityOther: values.entityOther || null,
      activityType: values.activityType,
      activityOther: values.activityOther || null,
      hours: decimalHours,
      description: values.description,
      notes: values.notes || null,
    };
    if (isEdit && id) {
      await updateHours.mutateAsync({ id, data: payload });
    } else {
      await createHours.mutateAsync(payload);
    }
    navigate('/');
  };

  const handleDelete = async () => {
    if (id) {
      await deleteHours.mutateAsync(id);
      navigate('/');
    }
  };

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">{isEdit ? 'Edit Hours' : 'Log Hours'}</h1>
        {isEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="ml-auto">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {isAutoLogged && (
        <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600 mb-4 flex items-center gap-2">
          <Car className="h-4 w-4 shrink-0" />
          This entry was auto-generated from a mileage log. You can edit it freely.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('date', { required: true })} className="mt-1" />
        </div>

        {/* Entity */}
        <div>
          <Label>Entity</Label>
          <Controller
            control={control}
            name="entity"
            rules={{ required: 'Please select an entity' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select entity…" />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_ENTITIES.map((e) => (
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
            <Input placeholder="Describe entity…" {...register('entityOther')} className="mt-1" />
          )}
        </div>

        {/* Activity Type */}
        <div>
          <Label>Activity Type</Label>
          <Controller
            control={control}
            name="activityType"
            rules={{ required: 'Please select an activity type' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select activity…" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.activityType && <p className="text-xs text-destructive mt-1">{errors.activityType.message}</p>}
          {activityType === 'Other' && (
            <Input placeholder="Describe activity…" {...register('activityOther')} className="mt-1" />
          )}
        </div>

        {/* Time input */}
        <div>
          <Label>Time Spent</Label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                min="0"
                max="23"
                {...register('hours', { min: 0 })}
                className="text-center text-lg font-semibold"
              />
              <span className="text-sm text-muted-foreground shrink-0">hr</span>
            </div>
            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                min="0"
                max="59"
                step="5"
                {...register('minutes', { min: 0, max: 59 })}
                className="text-center text-lg font-semibold"
              />
              <span className="text-sm text-muted-foreground shrink-0">min</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label>
            Description <span className="text-muted-foreground font-normal">(IRS required — be specific)</span>
          </Label>
          <Textarea
            placeholder="e.g., Met with tenant about lease renewal, Coordinated HVAC repair at Envoltz building, Showed 123 Main St to the Johnsons…"
            {...register('description', { required: 'Description is required for IRS compliance' })}
            className="mt-1"
            rows={3}
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        {/* Notes */}
        <div>
          <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input placeholder="Any additional notes…" {...register('notes')} className="mt-1" />
        </div>

        <Button type="submit" className="w-full h-12 text-base bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : (isEdit ? 'Save Changes' : 'Log Hours')}
        </Button>
      </form>
    </div>
  );
}
