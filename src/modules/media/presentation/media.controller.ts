import { DeleteMediaService } from "../application/services/delete-media.service";
import { ListMediaService } from "../application/services/list-media.service";
import { UploadMediaService } from "../application/services/upload-media.service";
import { MediaAssetEntity } from "../domain/entities/media-asset.entity";
import { memoryStorage } from "multer";

import { BadRequestException, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { MediaAssetResponseDto } from "./dto/media-asset-response.dto";

interface UploadedMulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags("media")
@ApiCookieAuth()
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
  @ApiOperation({ summary: "List all media assets, newest first" })
  @ApiResponse({ status: 200, type: [MediaAssetResponseDto] })
  async list(): Promise<MediaAssetEntity[]> {
    return this.listMediaService.execute();
  }

  @Post("upload")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("media:manager")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  @ApiOperation({ summary: "Upload a PNG or JPEG image" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } })
  @ApiResponse({ status: 201, type: MediaAssetResponseDto })
  @ApiResponse({ status: 400, description: "No file part present" })
  @ApiResponse({ status: 413, description: "Over MEDIA_MAX_UPLOAD_BYTES" })
  @ApiResponse({ status: 422, description: "Not a supported PNG/JPEG image" })
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
  @ApiOperation({ summary: "Delete a media asset (storage object removed before the DB row)" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 404, description: "Media asset not found" })
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.deleteMediaService.execute(documentId);
  }
}
