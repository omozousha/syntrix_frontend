import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import {
  Field,
  ComboboxField,
} from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function OdcTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};
  const allDevices = lookup.devices || [];

  // For ODC:
  // - Upstream Device = OTB type devices (upstream source)
  // - Upstream Cable = CABLE type devices (feeder cable)
  const upstreamDeviceOptions = toDeviceOptions(
    allDevices.filter((d) => d.device_type_key === "OTB"),
    t("topo.selectUpstreamOtb"),
    t,
  );

  const upstreamCableOptions = toDeviceOptions(
    allDevices.filter((d) => d.device_type_key === "CABLE" && (!d.route_type || d.route_type === "FEEDER")),
    t("topo.selectUpstreamCable"),
    t,
  );

  return (
    <TopologyCard title={t("topo.titleIncoming")}>
      <ComboboxField
        label="Upstream Device (OTB)"
        value={props.form.upstream_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, upstream_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchOtbUpstream")}
        options={upstreamDeviceOptions}
      />
      <ComboboxField
        label="Upstream Cable"
        value={props.form.upstream_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, upstream_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchFeederCable")}
        options={upstreamCableOptions}
      />
      <Field
        label="Core Start"
        type="number"
        value={props.form.upstream_core_start}
        onChange={(value) => props.onChange((prev) => ({ ...prev, upstream_core_start: value }))}
        disabled={!props.editing}
        compact
      />
      <Field
        label="Core End"
        type="number"
        value={props.form.upstream_core_end}
        onChange={(value) => props.onChange((prev) => ({ ...prev, upstream_core_end: value }))}
        disabled={!props.editing}
        compact
      />
    </TopologyCard>
  );
}
