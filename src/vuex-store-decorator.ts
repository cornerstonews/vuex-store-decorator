/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Vue from "vue";
import { Store, Module, Payload, MutationTree } from "vuex";

interface VuexStoreClassPrototype<S> {
    __vuexStoreClassInternalPrototype__: {
        mutations: MutationTree<S>;
        vuexStateName: string;
        vuexRootStore?: Store<any>;
        setters: Map<string, any>;
    };
}

type VuexStoreClass<S> = VuexStoreClassPrototype<S> & { constructor: any; prototype: any };

export interface VuexStoreOptions {
    stateName: string;
}

function initializeVuexStoreInternalObject<S>(vuexStoreClass: VuexStoreClass<S>) {
    let vuexStoreClassInternalObject = vuexStoreClass.__vuexStoreClassInternalPrototype__;
    if (!vuexStoreClassInternalObject) {
        vuexStoreClassInternalObject = Object.assign({ mutations: {}, vuexStateName: "", setters: {} }, vuexStoreClassInternalObject);
        vuexStoreClass.__vuexStoreClassInternalPrototype__ = vuexStoreClassInternalObject;
    }
    return vuexStoreClassInternalObject;
}

export function VuexStore<S>(options: VuexStoreOptions): any {
    return <TFunction>(constructor: TFunction): TFunction => {
        if (options) {
            const vuexStoreClass = (constructor as any) as VuexStoreClass<S>;
            const vuexStoreClassInternalObject = initializeVuexStoreInternalObject(vuexStoreClass);
            vuexStoreClassInternalObject.vuexStateName = options.stateName;
        }
        return constructor;
    };
}

export function VuexMutation<S extends any, R>(target: S, key: string | symbol, descriptor: TypedPropertyDescriptor<(...args: any[]) => R>): void {
    const vuexStoreClass = (target as any).constructor as VuexStoreClass<S>;
    const vuexStoreClassInternalObject = initializeVuexStoreInternalObject(vuexStoreClass);

    if (!vuexStoreClassInternalObject.mutations) {
        vuexStoreClassInternalObject.mutations = Object.assign({}, vuexStoreClassInternalObject.mutations);
    }

    if (descriptor.value) {
        //     // vuexStoreClassInternalObject.mutations[key as string] = descriptor.value;
        vuexStoreClassInternalObject.mutations[key as string] = (state: S, payload: Payload) => {
            Object.assign(state, payload);
        };
    }
}

function getStateFromInstance<S extends any>(storeInstance: VuexStoreClass<S>) {
    const vuexStoreClass: VuexStoreClass<S> = storeInstance.constructor;
    const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(vuexStoreClass.prototype);
    const vuexState = {} as S;
    const vuexMutations: MutationTree<S> = {};
    Object.keys(storeInstance as any).forEach((key: string) => {
        if (Object.prototype.hasOwnProperty.call(storeInstance, key)) {
            const keyType = typeof (storeInstance as any)[key];
            if (keyType !== "function") {
                const keyDescriptor = descriptors[key.replace(/_/gi, "")];
                const keyName = keyDescriptor ? key.replace(/_/gi, "") : key;

                // State property
                (vuexState as any)[keyName] = (storeInstance as any)[keyName];

                if (keyDescriptor && keyDescriptor.set) {
                    // Mutation for state property
                    vuexMutations[keyName] = (state: any, payload: any) => {
                        state[keyName] = payload;
                    };
                }
            }
        }
    });

    return { vuexState: vuexState, vuexMutations: vuexMutations };
}

function getVuexModule<S extends any>(vuexStoreClass: VuexStoreClass<S>, mutationMethods: MutationTree<S>): Module<S, any> {
    const storeInstance = new vuexStoreClass.prototype.constructor({}) as VuexStoreClass<S>;
    const vuexStateAndMutations = getStateFromInstance(storeInstance);
    const vuexState: S = vuexStateAndMutations.vuexState;
    const vuexMutations: MutationTree<S> = vuexStateAndMutations.vuexMutations;
    Object.assign(vuexMutations, mutationMethods);

    // Module Object
    return {
        state: vuexState,
        getters: {},
        mutations: vuexMutations,
        actions: {},
        namespaced: true
    };
}

export function initializeVuexStore<S>(vuexClass: S, rootStore: Store<any>): any {
    const vuexStoreClass = (vuexClass as any) as VuexStoreClass<S>;
    const vuexStoreClassInternalObject = initializeVuexStoreInternalObject(vuexStoreClass);
    const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(vuexStoreClass.prototype);

    let storeInstance: VuexStoreClass<S> | null = null;

    if (rootStore && !rootStore.hasModule(vuexStoreClassInternalObject.vuexStateName)) {
        const vuexModule: Module<S, any> = getVuexModule<S>(vuexStoreClass, vuexStoreClassInternalObject.mutations);
        rootStore.registerModule(vuexStoreClassInternalObject.vuexStateName, vuexModule);

        // Set watch on rootStore
        Object.keys(vuexModule.state as any).forEach((key) => {
            rootStore.watch(
                (state) => state[vuexStoreClassInternalObject.vuexStateName][key],
                (newValue, oldValue) => {
                    if (!oldValue) oldValue = {};
                    if (!newValue) newValue = {};

                    if (Object.entries(oldValue).sort().toString() === Object.entries(newValue).sort().toString()) {
                        return;
                    }

                    const currentValue = (storeInstance as any)[key] || {};
                    if (Object.entries(newValue).sort().toString() !== Object.entries(currentValue).sort().toString()) {
                        const method = (vuexStoreClassInternalObject.setters as any)[key];
                        !!method && method.call(storeInstance, newValue);
                    }
                },
                { deep: true }
            );
        });
    }

    for (const field in descriptors) {
        const fieldDescriptor = descriptors[field];
        if (field === "constructor") {
            continue;
        }

        if (fieldDescriptor.set) {
            const fieldDescriptorSet = fieldDescriptor.set;
            (vuexStoreClassInternalObject.setters as any)[field] = fieldDescriptorSet;
            Object.defineProperty(vuexStoreClass.prototype, field, {
                get: fieldDescriptor.get,
                set: (value: any) => {
                    fieldDescriptorSet.call(storeInstance, value);
                    rootStore.commit(`${vuexStoreClassInternalObject.vuexStateName}/${field}`, value);
                }
            });
        }

        if (Object.keys(vuexStoreClassInternalObject.mutations).includes(field)) {
            const fieldDescriptorValue = fieldDescriptor.value;
            vuexStoreClass.prototype[field] = (value: any) => {
                fieldDescriptorValue.call(storeInstance, value);
                rootStore.commit(`${vuexStoreClassInternalObject.vuexStateName}/${field}`, getStateFromInstance(storeInstance!).vuexState);
            };
        }
    }

    storeInstance = Vue.observable(new vuexStoreClass.prototype.constructor({}) as VuexStoreClass<S>);
    return storeInstance;
}

// export default VuexStore;
