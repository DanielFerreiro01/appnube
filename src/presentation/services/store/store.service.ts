import { StoreModel } from "../../../data/mongo";
import { CustomError } from "../../../domain";
import { CreateStoreDTO } from "../../../domain/dtos/store/create-store.dto";
import { UpdateStoreDTO } from "../../../domain/dtos/store/update-store.dto";
import { StoreResponseDTO } from "../../../domain/dtos/store/store-response.dto";
import { StoreEntity } from "../../../domain/entities/store/store.entity";
import { PaginationDto } from "../../../domain/dtos/shared/pagination.dto";

export class StoreService {
  constructor() {}

  async createStore(createStoreDto: CreateStoreDTO) {
    const existingStore = await StoreModel.findOne({
      tiendanubeUrl: createStoreDto.tiendanubeUrl,
    });

    if (existingStore) {
      throw CustomError.badRequest("Store with this URL already exists");
    }

    try {
      const newStore = new StoreModel({
        name: createStoreDto.name,
        tiendanubeUrl: createStoreDto.tiendanubeUrl,
        description: createStoreDto.description,
        logo: createStoreDto.logo,
        categories: [],
      });

      await newStore.save();

      const storeEntity = StoreEntity.fromObject(newStore);
      return StoreResponseDTO.fromEntity(storeEntity);
    } catch (error) {
      throw CustomError.internalServerError(`Error creating store: ${error}`);
    }
  }

  async getStores(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    try {
      const [stores, total] = await Promise.all([
        StoreModel.find()
          .skip((page - 1) * limit)
          .limit(limit),
        StoreModel.countDocuments(),
      ]);

      return {
        stores: stores.map((store) =>
          StoreResponseDTO.fromEntity(StoreEntity.fromObject(store))
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw CustomError.internalServerError(`Error getting stores: ${error}`);
    }
  }

  async getStoreById(id: string) {
    try {
      const store = await StoreModel.findById(id);

      if (!store) {
        throw CustomError.notFound("Store not found");
      }

      const storeEntity = StoreEntity.fromObject(store);
      return StoreResponseDTO.fromEntity(storeEntity);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(`Error getting store: ${error}`);
    }
  }

  async updateStore(id: string, updateStoreDto: UpdateStoreDTO) {
    try {
      const store = await StoreModel.findById(id);

      if (!store) {
        throw CustomError.notFound("Store not found");
      }

      // Verificar que la URL no esté siendo usada por otra tienda
      if (updateStoreDto.tiendanubeUrl && updateStoreDto.tiendanubeUrl !== store.tiendanubeUrl) {
        const existingStore = await StoreModel.findOne({
          tiendanubeUrl: updateStoreDto.tiendanubeUrl,
          _id: { $ne: id },
        });

        if (existingStore) {
          throw CustomError.badRequest("Store with this URL already exists");
        }
      }

      // Verificar que el storeId no esté siendo usado por otra tienda
      if (updateStoreDto.storeId && updateStoreDto.storeId !== store.storeId) {
        const existingStore = await StoreModel.findOne({
          storeId: updateStoreDto.storeId,
          _id: { $ne: id },
        });

        if (existingStore) {
          throw CustomError.badRequest("Store ID from Tiendanube already exists");
        }
      }

      // Actualizar solo los campos que vienen en el DTO
      if (updateStoreDto.name !== undefined) store.name = updateStoreDto.name;
      if (updateStoreDto.tiendanubeUrl !== undefined) store.tiendanubeUrl = updateStoreDto.tiendanubeUrl;
      if (updateStoreDto.description !== undefined) store.description = updateStoreDto.description;
      if (updateStoreDto.logo !== undefined) store.logo = updateStoreDto.logo;
      if (updateStoreDto.storeId !== undefined) store.storeId = updateStoreDto.storeId;
      if (updateStoreDto.accessToken !== undefined) store.accessToken = updateStoreDto.accessToken;

      await store.save();

      const storeEntity = StoreEntity.fromObject(store);
      return StoreResponseDTO.fromEntity(storeEntity);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(`Error updating store: ${error}`);
    }
  }

  async deleteStore(id: string) {
    try {
      const store = await StoreModel.findByIdAndDelete(id);

      if (!store) {
        throw CustomError.notFound("Store not found");
      }

      return { message: "Store deleted successfully" };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServerError(`Error deleting store: ${error}`);
    }
  }
}