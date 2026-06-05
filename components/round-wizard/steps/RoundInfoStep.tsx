'use client';

import InputFormGroup from '@/components/ui/InputFormGroup';

interface RoundInfoStepProps {
  title: string;
  description: string;
  onUpdate: (payload: { title: string; description: string }) => void;
}

export default function RoundInfoStep({ title, description, onUpdate }: RoundInfoStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-bold text-xl text-brand-black mb-1">What&apos;s your round about?</h2>
        <p className="text-sm text-brand-gray">Give your round a clear name and description so builders know what to submit.</p>
      </div>

      <InputFormGroup
        label="Round title"
        name="title"
        value={title}
        onChange={(e) => onUpdate({ title: e.target.value, description })}
        placeholder="e.g. Build the Nouns Ecosystem"
        required
        error={title.length > 128 ? 'Title must be under 128 characters' : undefined}
      />

      <div>
        <InputFormGroup
          label="Description"
          name="description"
          value={description}
          onChange={(e) => onUpdate({ title, description: e.target.value })}
          placeholder="Describe what kind of proposals you're looking for..."
          textarea
          rows={6}
        />
        <p className="text-xs text-brand-gray mt-1">
          Supports Markdown. {description.length > 1000 && (
            <span className="text-brand-red">Max 1000 characters.</span>
          )}
        </p>
      </div>
    </div>
  );
}
