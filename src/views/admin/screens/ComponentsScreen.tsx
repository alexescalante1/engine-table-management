"use client";

import { useState } from "react";
import { Info, Trash2, Star, Plus, Store } from "lucide-react";
import {
  Card,
  Badge,
  Button,
  IconButton,
  SelectorButton,
  FilterPill,
  CopyButton,
  Skeleton,
  ScreenHeader,
  SectionHeader,
  SettingItem,
  CollapsibleSection,
  Tooltip,
  InputText,
  InputNumber,
  InputSearch,
  Textarea,
  MoneyInput,
  ColorInput,
  SearchSelect,
  TagListInput,
  CityField,
  Toggle,
  Checkbox,
  Stepper,
  RadialDial,
  AspectPicker,
  StepTimeline,
  DateWindowPicker,
  Modal,
  ConfirmModal,
  SlidePanel,
  FullScreenOverlay,
  EmptyState,
  type GalleryAspect,
} from "@/views/admin/components";
import StatCard from "@/views/admin/components/StatCard";
import SaveStatusIndicator from "@/views/admin/components/SaveStatusIndicator";
import { useToast, ToastVariant } from "@/views/admin/providers";

// Showcase del kit base — renderiza los componentes reutilizables en vivo.
// Sin lógica de negocio: solo estado local de UI para demostrar cada control.

const loadDemoCities = async (): Promise<readonly string[]> => [
  "Lima", "Arequipa", "Cusco", "Trujillo", "Piura", "Chiclayo", "Iquitos",
];

const STEP_OPTIONS = [
  { value: "low", label: "Bajo" },
  { value: "mid", label: "Medio" },
  { value: "high", label: "Alto" },
];

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <SectionHeader label={label} />
      <Card className="space-y-4">{children}</Card>
    </div>
  );
}

export default function ComponentsScreen() {
  const { showToast } = useToast();

  const [text, setText] = useState("Mesa 12");
  const [num, setNum] = useState("4");
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [money, setMoney] = useState("25.00");
  const [color, setColor] = useState("#f0956e");
  const [city, setCity] = useState("");
  const [select, setSelect] = useState("");
  const [tags, setTags] = useState<string[]>(["terraza", "salón"]);
  const [toggle, setToggle] = useState(true);
  const [star, setStar] = useState(false);
  const [check, setCheck] = useState(true);
  const [step, setStep] = useState(4);
  const [radial, setRadial] = useState(60);
  const [aspect, setAspect] = useState<GalleryAspect>("16:9");
  const [pace, setPace] = useState("mid");
  const [selected, setSelected] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");

  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [panel, setPanel] = useState(false);
  const [overlay, setOverlay] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <ScreenHeader title="Componentes" subtitle="Suite base del admin — todos los primitives y modals en vivo." />

      {/* Botones y acciones */}
      <Block label="Botones y acciones">
        <div className="flex flex-wrap gap-2">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Peligro</Button>
          <Button loading>Cargando</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
          <IconButton aria-label="Eliminar"><Trash2 size={18} /></IconButton>
          <SelectorButton selected={selected} onClick={() => setSelected((s) => !s)}>
            Seleccionable
          </SelectorButton>
          <CopyButton value="mesa-12" label="Copiar ID" />
        </div>
        <div className="flex flex-wrap gap-2">
          {["todas", "libres", "ocupadas"].map((f) => (
            <FilterPill key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </FilterPill>
          ))}
        </div>
      </Block>

      {/* Badges y estado */}
      <Block label="Badges y estado de guardado">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Libre</Badge>
          <Badge variant="warning">Reservada</Badge>
          <Badge variant="danger">Ocupada</Badge>
          <Badge variant="info">Info</Badge>
        </div>
        <div className="flex flex-wrap gap-4">
          <SaveStatusIndicator status="saving" hasValidationErrors={false} />
          <SaveStatusIndicator status="saved" hasValidationErrors={false} />
          <SaveStatusIndicator status="error" hasValidationErrors={false} />
        </div>
      </Block>

      {/* Inputs */}
      <Block label="Inputs y campos">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputText label="Texto" value={text} onChange={(e) => setText(e.target.value)} />
          <InputText label="Con error" value="" error="Campo requerido" onChange={() => {}} />
          <InputNumber label="Número" value={num} onChange={(e) => setNum(e.target.value)} suffix="pax" />
          <MoneyInput label="Precio" symbol="S/" decimals={2} value={money} onValueChange={setMoney} />
          <InputSearch value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Buscar..." />
          <ColorInput label="Color de marca" value={color} onChange={setColor} />
          <SearchSelect
            label="Zona"
            value={select}
            onChange={setSelect}
            placeholder="Elige una zona"
            options={[
              { value: "salon", label: "Salón principal" },
              { value: "terraza", label: "Terraza" },
              { value: "barra", label: "Barra" },
            ]}
          />
          <CityField label="Ciudad" value={city} onChange={setCity} loadCities={loadDemoCities} placeholder="Escribe una ciudad" />
        </div>
        <Textarea label="Notas" value={area} onChange={(e) => setArea(e.target.value)} counter={{ current: area.length, max: 200 }} maxLength={200} />
        <TagListInput label="Etiquetas" items={tags} onAdd={(t) => setTags((p) => [...p, t])} onRemove={(i) => setTags((p) => p.filter((_, idx) => idx !== i))} placeholder="Agregar etiqueta" />
      </Block>

      {/* Controles */}
      <Block label="Controles">
        <Toggle checked={toggle} onChange={setToggle} label="Reservas online" description="Permitir reservar desde la web." />
        <Toggle checked={star} onChange={setStar} accent="amber" label="Destacado" thumbIcon={<Star size={12} />} />
        <Checkbox checked={check} onChange={setCheck} label="Acepto los términos" />
        <div className="flex flex-wrap items-center gap-8">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500">Stepper</span>
            <Stepper value={step} onChange={setStep} min={1} max={12} suffix="pax" />
          </div>
          <div className="space-y-1 text-center">
            <span className="text-xs text-zinc-500">RadialDial</span>
            <RadialDial value={radial} onChange={setRadial} max={100} ariaLabel="Ocupación">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{radial}%</span>
            </RadialDial>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-zinc-500">AspectPicker</span>
          <AspectPicker value={aspect} onChange={setAspect} />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-zinc-500">StepTimeline</span>
          <StepTimeline options={STEP_OPTIONS} value={pace} onChange={setPace} ariaLabel="Ritmo" />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-zinc-500">DateWindowPicker</span>
          <DateWindowPicker from={from} until={until} onChange={(f, u) => { setFrom(f); setUntil(u); }} intro="Ventana de la promoción" />
        </div>
      </Block>

      {/* Overlays / modals */}
      <Block label="Overlays y modals">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModal(true)}>Modal (centrado)</Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>Modal sheet (mobile)</Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>ConfirmModal</Button>
          <Button variant="secondary" onClick={() => setPanel(true)}>Aside lateral (SlidePanel)</Button>
          <Button variant="outline" onClick={() => setOverlay(true)}>FullScreenOverlay</Button>
          <Tooltip content="Panel de ayuda contextual anclado al trigger.">
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600">
              <Info size={16} /> Tooltip
            </span>
          </Tooltip>
        </div>
        <EmptyState title="Sin resultados" description="Ejemplo de estado vacío embebido." icon={Store} action={<Button size="sm"><Plus size={16} /> Crear</Button>} />
      </Block>

      {/* Layout */}
      <Block label="Layout y contenedores">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Mesas" value="12 / 20" icon={Store} hint="60% ocupación" />
          <StatCard label="Reservas" value="34" icon={Star} hint="8 pendientes" />
        </div>
        <SettingItem
          icon={<Store size={18} />}
          label="Modo mantenimiento"
          description="Oculta el sitio público temporalmente."
          trailing={<Toggle checked={false} onChange={() => {}} />}
        />
        <CollapsibleSection title="Sección colapsable" summary="Contenido plegable" variant="card">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Contenido dentro de una CollapsibleSection.
          </p>
        </CollapsibleSection>
      </Block>

      {/* Feedback */}
      <Block label="Feedback (Skeleton + Toast)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => showToast("Guardado con éxito", ToastVariant.SUCCESS)}>Toast éxito</Button>
          <Button size="sm" variant="danger" onClick={() => showToast("Ocurrió un error", ToastVariant.ERROR)}>Toast error</Button>
          <Button size="sm" variant="secondary" onClick={() => showToast("Procesando…", ToastVariant.LOADING)}>Toast loading</Button>
        </div>
      </Block>

      {/* Modals montados */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Modal de ejemplo"
        bottomContent={<Button className="w-full" onClick={() => setModal(false)}>Cerrar</Button>}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Contenido del modal. Responsive: full-screen en mobile, centrado en desktop.
        </p>
      </Modal>

      <Modal
        open={sheet}
        onClose={() => setSheet(false)}
        title="Modal sheet"
        sheet
        bottomContent={<Button className="w-full" onClick={() => setSheet(false)}>Listo</Button>}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Con <code>sheet</code>: en mobile se muestra como bottom sheet (se desliza
          desde abajo); en desktop se centra igual que un modal normal. Ideal para
          1–2 campos.
        </p>
      </Modal>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); showToast("Eliminado", ToastVariant.SUCCESS); }}
        title="¿Eliminar mesa?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />

      <SlidePanel open={panel} onClose={() => setPanel(false)}>
        <div className="p-5">
          <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">Panel lateral</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Contenido del SlidePanel.</p>
          <Button className="mt-4" onClick={() => setPanel(false)}>Cerrar</Button>
        </div>
      </SlidePanel>

      <FullScreenOverlay open={overlay} onClose={() => setOverlay(false)} title="Overlay a pantalla completa">
        <div className="p-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Contenido del FullScreenOverlay.</p>
        </div>
      </FullScreenOverlay>
    </div>
  );
}
