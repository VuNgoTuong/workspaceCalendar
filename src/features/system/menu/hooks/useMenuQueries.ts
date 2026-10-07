import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MenuItem } from '../../types';
import { menuAPI } from '../../../../services/api/menuAPI';

const buildTableTree = (flatMenus: any[]): any[] => {
  const sorted = [...flatMenus].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const menuMap: Record<string, any> = {};
  const roots: any[] = [];

  sorted.forEach((item) => {
    menuMap[item.id] = {
      ...item,
      children: []
    };
  });

  sorted.forEach((item) => {
    const parentId = item.parentId;
    const mapped = menuMap[item.id];
    if (parentId && menuMap[parentId]) {
      menuMap[parentId].children.push(mapped);
    } else {
      roots.push(mapped);
    }
  });

  const removeEmpty = (nodes: any[]): any[] => {
    return nodes.map((node) => {
      if (node.children) {
        if (node.children.length === 0) {
          delete node.children;
        } else {
          node.children = removeEmpty(node.children);
        }
      }
      return node;
    });
  };

  return removeEmpty(roots);
};

export const useMenusQuery = (params?: { search?: string }) => {
  return useQuery<MenuItem[]>({
    queryKey: ['menus', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await menuAPI.getMenus(params);
      const items = Array.isArray(res) ? res : (res?.items || []);
      return buildTableTree(items);
    },
  });
};

export const useCreateMenuMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (menu: Omit<MenuItem, 'id'>) => {
      return await menuAPI.createMenu(menu);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
};

export const useUpdateMenuMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<MenuItem, 'id'> }) => {
      return await menuAPI.updateMenu(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
};

export const useDeleteMenuMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await menuAPI.deleteMenu(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
};
