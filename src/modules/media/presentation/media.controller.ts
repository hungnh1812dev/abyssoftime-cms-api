import { DeleteMediaService } from "../application/services/delete-media.service";
import { ListMediaService } from "../application/services/list-media.service";
import { UploadMediaService } from "../application/services/upload-media.service";
import { MediaAssetEntity } from "../domain/entities/media-asset.entity";
import { memoryStorage } from "multer";

import { BadRequestException, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

interface UploadedMulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller("/api/media")
export class MediaController {
  constructor(
    private readonly uploadMediaService: UploadMediaService,
    private readonly listMediaService: ListMediaService,
    private readonly deleteMediaService: DeleteMediaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("media:read")
  async list(): Promise<MediaAssetEntity[]> {
    return this.listMediaService.execute();
  }

  @Post("upload")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("media:manager")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  async upload(@UploadedFile() file: UploadedMulterFile, @Req() req: AuthenticatedRequest): Promise<MediaAssetEntity> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    return this.uploadMediaService.execute({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      uploadedBy: req.user.sub,
    });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("media:manager")
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.deleteMediaService.execute(documentId);
  }
}
