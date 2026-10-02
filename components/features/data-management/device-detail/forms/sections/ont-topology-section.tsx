import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function OntTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title={t("topo.titleOnt")}>
      <ComboboxField
        label="Source ODP"
        value={props.form.source_odp_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_odp_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchSourceOdp")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectSourceOdp"), t)}
      />
      <ComboboxField
        label="ODP Port"
        value={props.form.source_odp_port_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_odp_port_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchOdpPort")}
        options={[
          { value: "__none__", label: t("topo.selectOdpPort") },
          ...(lookup.ports || []).map((port) => ({
            value: port.id,
            label: port.port_label || `Port ${port.port_index || "?"}`,
          })),
        ]}
      />
      <ComboboxField
        label="Source OLT"
        value={props.form.source_olt_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, source_olt_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchSourceOlt")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectSourceOlt"), t)}
      />
    </TopologyCard>
  );
}
