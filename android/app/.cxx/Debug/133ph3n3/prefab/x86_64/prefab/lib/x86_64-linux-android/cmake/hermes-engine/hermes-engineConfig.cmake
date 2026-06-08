if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/home/tchinda/.gradle/caches/9.3.1/transforms/f3c1376d2b90128f3b7f09b7bdb6ba78/transformed/hermes-android-0.79.2-debug/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/tchinda/.gradle/caches/9.3.1/transforms/f3c1376d2b90128f3b7f09b7bdb6ba78/transformed/hermes-android-0.79.2-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

