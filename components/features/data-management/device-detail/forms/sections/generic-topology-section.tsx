import {
  type TopologySectionProps,
  TopologyCard,
  toDeviceOptions,
} from "../../sections/device-topology-helpers";
import { ComboboxField } from "../../sections/device-technical-helpers";
import { useTranslate } from "@/lib/use-locale";

export function GenericTopologySection(props: TopologySectionProps) {
  const { t } = useTranslate();
  const lookup = props.topologyLookup || {};

  return (
    <TopologyCard title={t("topo.titleGeneric")}>
      <ComboboxField
        label="Uplink Device"
        value={props.form.uplink_device_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, uplink_device_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchUplinkDevice")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectUplinkDevice"), t)}
      />
      <ComboboxField
        label="From Cable"
        value={props.form.from_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, from_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchFromCable")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectFromCable"), t)}
      />
      <ComboboxField
        label="To Cable"
        value={props.form.to_cable_id || "__none__"}
        onValueChange={(value) =>
          props.onChange((prev) => ({ ...prev, to_cable_id: value === "__none__" ? "" : value }))
        }
        disabled={!props.editing}
        searchPlaceholder={t("topo.searchToCable")}
        options={toDeviceOptions(lookup.devices || [], t("topo.selectToCable"), t)}
      />
    </TopologyCard>
  );
}
