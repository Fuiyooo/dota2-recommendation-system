import { Module } from "@nestjs/common";
import { OpenDotaClient } from "../data-sources/opendota/opendota.client";
import { StratzClient } from "../data-sources/stratz/stratz.client";
import { ValveClient } from "../data-sources/valve/valve.client";
import { ConstantsSyncService } from "./constants-sync.service";
import { MetaSyncService } from "./meta-sync.service";
import { PatchValidationService } from "./patch-validation.service";
import { RawStoreService } from "./raw-store.service";

@Module({
  providers: [
    ValveClient,
    OpenDotaClient,
    StratzClient,
    RawStoreService,
    PatchValidationService,
    ConstantsSyncService,
    MetaSyncService,
  ],
  exports: [
    ValveClient,
    OpenDotaClient,
    StratzClient,
    RawStoreService,
    PatchValidationService,
    ConstantsSyncService,
    MetaSyncService,
  ],
})
export class SyncModule {}
