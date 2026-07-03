package com.example.notifyflowlibrary

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.os.Build
import com.example.notifyflowlibrary.model.MessageVariant
import com.example.notifyflowlibrary.model.NotificationMessage
import com.example.notifyflowlibrary.model.NotificationEvent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.example.notifyflowlibrary.network.NotificationsController
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken


object NotifyFlow {

    private const val TAG = "NotifyFlow"

    private const val EVENT_IMPRESSION = "IMPRESSION"
    private const val EVENT_CLICK = "CLICK"

    private const val PREFS_NAME = "notifyflow_prefs"
    private const val VIEWS_PREFIX = "views_"
    private const val MESSAGES_CACHE_PREFIX = "cached_messages_"

    private var appContext: Context? = null
    private var apiKey: String? = null
    private var userId: String? = null
    private var country: String? = null
    private var androidVersion: Int? = null
    private var baseUrl: String? = null

    private val notificationsController = NotificationsController()
    private val gson = Gson()

    private val messages: ArrayList<NotificationMessage> = arrayListOf()
    private var isNotificationShowing = false

    // Keeps screen names that already showed one notification in the current app session.
    // This is not saved in SharedPreferences, so it resets when the app process restarts.
    private val shownScreenKeysInSession = mutableSetOf<String>()

    private fun getSessionScreenKey(screenName: String): String {
        val currentApiKey = apiKey ?: "unknown_api_key"
        val currentUserId = userId ?: "unknown_user"
        val currentCountry = country ?: "unknown_country"
        val currentAndroidVersion = androidVersion ?: 0
        val currentBaseUrlHash = baseUrl?.hashCode() ?: 0

        return "${currentApiKey}_${currentUserId}_${currentCountry}_${currentAndroidVersion}_${currentBaseUrlHash}_${screenName}"
    }

    private fun hasSdkContextChanged(
        newApiKey: String,
        newUserId: String,
        newCountry: String,
        newBaseUrl: String,
        newAndroidVersion: Int
    ): Boolean {
        val hasPreviousContext =
            this.apiKey != null ||
                    this.userId != null ||
                    this.country != null ||
                    this.baseUrl != null ||
                    this.androidVersion != null

        if (!hasPreviousContext) {
            return false
        }

        return this.apiKey != newApiKey ||
                this.userId != newUserId ||
                this.country != newCountry ||
                this.baseUrl != newBaseUrl ||
                this.androidVersion != newAndroidVersion
    }
    private fun clearContextDependentState() {
        messages.clear()
        isNotificationShowing = false
    }

    fun init(
        context: Context,
        apiKey: String,
        userId: String,
        country: String,
        baseUrl: String,
        androidVersion: Int = Build.VERSION.SDK_INT
    ) {
        if (baseUrl.isBlank()) {
            return
        }

        val contextChanged = hasSdkContextChanged(
            newApiKey = apiKey,
            newUserId = userId,
            newCountry = country,
            newBaseUrl = baseUrl,
            newAndroidVersion = androidVersion
        )

        if (contextChanged) {
            clearContextDependentState()
        }

        this.appContext = context.applicationContext
        this.apiKey = apiKey
        this.userId = userId
        this.country = country
        this.baseUrl = baseUrl
        this.androidVersion = androidVersion

        notificationsController.setBaseUrl(baseUrl)
    }

    fun fetchMessages() {

        if (!isInitialized()) {
            return
        }

        val currentApiKey = apiKey
        val currentUserId = userId
        val currentCountry = country
        val currentAndroidVersion = androidVersion

        if (
            currentApiKey == null ||
            currentUserId == null ||
            currentCountry == null ||
            currentAndroidVersion == null
        ) {
            return
        }

        notificationsController.getMessages(
            apiKey = currentApiKey,
            userId = currentUserId,
            country = currentCountry,
            androidVersion = currentAndroidVersion,
            callback = object : NotificationsController.MyCallback<ArrayList<NotificationMessage>> {
                override fun onSuccess(data: ArrayList<NotificationMessage>) {
                    messages.clear()
                    messages.addAll(data)

                    saveMessagesToCache(data)
                }

                override fun onError(message: String?) {
                    loadMessagesFromCache()
                }
            }
        )
    }

    fun checkAndShow(activity: Activity, screenName: String) {

        if (!isInitialized()) {
            return
        }

        if (messages.isEmpty()) {
            return
        }

        if (isNotificationShowing) {
            return
        }

        if (wasScreenShownInCurrentSession(screenName)) {
            return
        }

        val relevantMessage = findRelevantMessage(screenName)

        if (relevantMessage == null) {
            return
        }

        val selectedVariant = chooseVariant(relevantMessage)

        isNotificationShowing = true

        when (relevantMessage.type) {
            "POPUP" -> {
                showPopup(activity, relevantMessage, selectedVariant)
            }

            "BANNER" -> {
                showBanner(activity, relevantMessage, selectedVariant)
            }

            else -> {
                isNotificationShowing = false
            }
        }
    }

    private fun showPopup(
        activity: Activity,
        message: NotificationMessage,
        variant: MessageVariant?
    ) {
        val messageId = message.id

        if (messageId.isNullOrEmpty()) {
            isNotificationShowing = false
            return
        }

        val titleToShow = variant?.title ?: message.title
        val bodyToShow = variant?.body ?: message.body
        val buttonTextToShow = variant?.buttonText ?: "Open"

        trackImpression(message, variant)
        incrementViewsCount(messageId)
        markScreenAsShownInCurrentSession(message.screenName)

        val dialog = Dialog(activity)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setCancelable(true)

        dialog.setOnDismissListener {
            isNotificationShowing = false
        }

        val popupBackground = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.WHITE)
            cornerRadius = 32f
            setStroke(1, Color.parseColor("#E5E7EB"))
        }

        val actionButtonBackground = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor("#16A34A"))
            cornerRadius = 999f
        }

        val cancelButtonBackground = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor("#F3F4F6"))
            cornerRadius = 999f
        }

        val popupLayout = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            background = popupBackground
            layoutDirection = View.LAYOUT_DIRECTION_LTR
            setPadding(40, 32, 40, 36)
        }

        val topRow = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_LTR
        }

        val titleTextView = TextView(activity).apply {
            text = titleToShow
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111827"))
            gravity = Gravity.START
            textDirection = View.TEXT_DIRECTION_LTR
            layoutDirection = View.LAYOUT_DIRECTION_LTR
        }

        val closeButton = TextView(activity).apply {
            text = "×"
            textSize = 26f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#6B7280"))
            gravity = Gravity.CENTER
            setPadding(24, 0, 0, 0)
            layoutDirection = View.LAYOUT_DIRECTION_LTR

            setOnClickListener {
                dialog.dismiss()
            }
        }

        val titleParams = LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        )

        topRow.addView(titleTextView, titleParams)
        topRow.addView(closeButton)

        val bodyTextView = TextView(activity).apply {
            text = bodyToShow
            textSize = 15f
            setTextColor(Color.parseColor("#4B5563"))
            gravity = Gravity.START
            textDirection = View.TEXT_DIRECTION_LTR
            layoutDirection = View.LAYOUT_DIRECTION_LTR
            setLineSpacing(4f, 1.0f)
            setPadding(0, 18, 0, 28)
        }

        val buttonsRow = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            layoutDirection = View.LAYOUT_DIRECTION_LTR
        }

        val dismissButton = Button(activity).apply {
            text = "Dismiss"
            textSize = 14f
            isAllCaps = false
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#374151"))
            background = cancelButtonBackground
            setPadding(28, 0, 28, 0)

            setOnClickListener {
                dialog.dismiss()
            }
        }

        val actionButton = Button(activity).apply {
            text = buttonTextToShow
            textSize = 14f
            isAllCaps = false
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            background = actionButtonBackground
            setPadding(32, 0, 32, 0)

            setOnClickListener {
                trackClick(messageId, variant?.id)
                dialog.dismiss()
            }
        }

        val dismissButtonParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            96
        ).apply {
            marginEnd = 16
        }

        val actionButtonParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            96
        )

        buttonsRow.addView(dismissButton, dismissButtonParams)
        buttonsRow.addView(actionButton, actionButtonParams)

        popupLayout.addView(topRow)
        popupLayout.addView(bodyTextView)
        popupLayout.addView(buttonsRow)

        dialog.setContentView(popupLayout)

        dialog.window?.apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            setLayout(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        dialog.setOnShowListener {
            dialog.window?.setLayout(
                (activity.resources.displayMetrics.widthPixels * 0.88).toInt(),
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        dialog.show()
    }

    private fun showBanner(
        activity: Activity,
        message: NotificationMessage,
        variant: MessageVariant?
    ) {
        val messageId = message.id

        if (messageId.isNullOrEmpty()) {
            isNotificationShowing = false
            return
        }

        val titleToShow = variant?.title ?: message.title
        val bodyToShow = variant?.body ?: message.body
        val buttonTextToShow = variant?.buttonText ?: "Open"

        trackImpression(message, variant)
        incrementViewsCount(messageId)
        markScreenAsShownInCurrentSession(message.screenName)

        val rootView = activity.findViewById<ViewGroup>(android.R.id.content)

        val bannerBackground = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.WHITE)
            cornerRadius = 28f
            setStroke(1, Color.parseColor("#E5E7EB"))
        }

        val actionButtonBackground = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(Color.parseColor("#16A34A"))
            cornerRadius = 999f
        }

        val bannerLayout = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            background = bannerBackground
            layoutDirection = View.LAYOUT_DIRECTION_LTR
            setPadding(32, 28, 32, 28)
        }

        fun closeBanner() {
            if (bannerLayout.parent != null) {
                rootView.removeView(bannerLayout)
            }

            isNotificationShowing = false
        }

        val topRow = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_LTR
        }

        val textColumn = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
        }

        val titleTextView = TextView(activity).apply {
            text = titleToShow
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111827"))
        }

        val bodyTextView = TextView(activity).apply {
            text = bodyToShow
            textSize = 14f
            setTextColor(Color.parseColor("#4B5563"))
            setPadding(0, 6, 0, 0)
        }

        textColumn.addView(titleTextView)
        textColumn.addView(bodyTextView)

        val closeButton = TextView(activity).apply {
            text = "×"
            textSize = 24f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#6B7280"))
            gravity = Gravity.CENTER
            setPadding(20, 0, 0, 0)

            setOnClickListener {
                closeBanner()
            }
        }

        val textColumnParams = LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        )

        topRow.addView(textColumn, textColumnParams)
        topRow.addView(closeButton)

        val actionButton = Button(activity).apply {
            text = buttonTextToShow
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            background = actionButtonBackground
            isAllCaps = false
            setPadding(28, 0, 28, 0)

            setOnClickListener {
                trackClick(messageId, variant?.id)
                closeBanner()
            }
        }

        val buttonParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            96
        ).apply {
            gravity = Gravity.END
            topMargin = 20
        }

        bannerLayout.addView(topRow)
        bannerLayout.addView(actionButton, buttonParams)

        val layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP
            setMargins(32, 96, 32, 0)
        }

        rootView.addView(bannerLayout, layoutParams)
    }

    private fun wasScreenShownInCurrentSession(screenName: String): Boolean {
        val sessionScreenKey = getSessionScreenKey(screenName)

        if (shownScreenKeysInSession.contains(sessionScreenKey)) {
            return true
        }

        return false
    }

    private fun markScreenAsShownInCurrentSession(screenName: String?) {
        if (screenName.isNullOrEmpty()) {
            return
        }

        val sessionScreenKey = getSessionScreenKey(screenName)

        shownScreenKeysInSession.add(sessionScreenKey)
    }

    private fun getPrefs(): SharedPreferences? {
        return appContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    private fun getMessagesCacheKey(): String {
        val currentApiKey = apiKey ?: "unknown_api_key"
        val currentUserId = userId ?: "unknown_user"
        val currentCountry = country ?: "unknown_country"
        val currentAndroidVersion = androidVersion ?: 0
        val currentBaseUrlHash = baseUrl?.hashCode() ?: 0

        return "$MESSAGES_CACHE_PREFIX${currentApiKey}_${currentUserId}_${currentCountry}_${currentAndroidVersion}_${currentBaseUrlHash}"
    }

    private fun saveMessagesToCache(serverMessages: ArrayList<NotificationMessage>) {
        val prefs = getPrefs() ?: return

        try {
            val json = gson.toJson(serverMessages)

            prefs.edit()
                .putString(getMessagesCacheKey(), json)
                .apply()
        } catch (error: Exception) {
            return
        }
    }

    private fun loadMessagesFromCache(): Boolean {
        val prefs = getPrefs() ?: return false

        val json = prefs.getString(getMessagesCacheKey(), null)

        if (json.isNullOrEmpty()) {
            return false
        }

        return try {
            val type = object : TypeToken<ArrayList<NotificationMessage>>() {}.type
            val cachedMessages: ArrayList<NotificationMessage> = gson.fromJson(json, type)

            messages.clear()
            messages.addAll(cachedMessages)

            true
        } catch (error: Exception) {
            false
        }
    }

    private fun getViewsKey(messageId: String): String {
        val currentUserId = userId ?: "unknown_user"
        return "$VIEWS_PREFIX${currentUserId}_$messageId"
    }

    private fun getViewsCount(messageId: String): Int {
        val prefs = getPrefs() ?: return 0
        return prefs.getInt(getViewsKey(messageId), 0)
    }

    private fun incrementViewsCount(messageId: String) {
        val prefs = getPrefs() ?: return

        val currentCount = getViewsCount(messageId)
        val newCount = currentCount + 1

        prefs.edit()
            .putInt(getViewsKey(messageId), newCount)
            .apply()

    }

    private fun canShowMessageByMaxViews(message: NotificationMessage): Boolean {
        val messageId = message.id ?: return false

        val currentViews = getViewsCount(messageId)
        val maxViews = message.maxViewsPerUser

        if (currentViews >= maxViews) {
            return false
        }

        return true
    }

    fun resetViewsForTesting() {
        val prefs = getPrefs()

        if (prefs == null) {
            return
        }

        val editor = prefs.edit()

        prefs.all.keys
            .filter { key -> key.startsWith(VIEWS_PREFIX) }
            .forEach { key -> editor.remove(key) }

        editor.apply()

        shownScreenKeysInSession.clear()

    }

    private fun createEvent(
        messageId: String?,
        variantId: String?,
        eventType: String
    ): NotificationEvent {
        val event = NotificationEvent()

        event.messageId = messageId
        event.variantId = variantId
        event.userId = userId
        event.country = country
        event.eventType = eventType

        return event
    }

    private fun trackImpression(
        message: NotificationMessage,
        variant: MessageVariant?
    ) {
        val event = createEvent(
            messageId = message.id,
            variantId = variant?.id,
            eventType = EVENT_IMPRESSION
        )

        notificationsController.sendImpression(
            event = event,
            callback = object : NotificationsController.MyCallback<Void?> {
                override fun onSuccess(data: Void?) {
                }

                override fun onError(message: String?) {
                }
            }
        )
    }

    fun trackClick(
        messageId: String,
        variantId: String? = null
    ) {
        val event = createEvent(
            messageId = messageId,
            variantId = variantId,
            eventType = EVENT_CLICK
        )

        notificationsController.sendClick(
            event = event,
            callback = object : NotificationsController.MyCallback<Void?> {
                override fun onSuccess(data: Void?) {
                }

                override fun onError(message: String?) {
                }
            }
        )
    }

    private fun isInitialized(): Boolean {
        return appContext != null &&
                apiKey != null &&
                userId != null &&
                country != null &&
                baseUrl != null &&
                androidVersion != null
    }

    private fun findRelevantMessage(screenName: String): NotificationMessage? {
        for (message in messages) {
            if (!isMessageRelevant(message, screenName)) {
                continue
            }

            if (!canShowMessageByMaxViews(message)) {
                continue
            }

            return message
        }

        return null
    }

    private fun isMessageRelevant(
        message: NotificationMessage,
        screenName: String
    ): Boolean {
        if (!message.active) {
            return false
        }

        if (!isMessageInDateRange(message)) {
            return false
        }

        if (message.screenName != screenName) {
            return false
        }

        val currentCountry = country ?: return false

        if (!message.countries.contains(currentCountry)) {
            return false
        }

        val currentAndroidVersion = androidVersion ?: return false

        if (currentAndroidVersion < message.minAndroidVersion) {
            return false
        }

        if (currentAndroidVersion > message.maxAndroidVersion) {
            return false
        }

        return true
    }

    private fun chooseVariant(message: NotificationMessage): MessageVariant? {
        if (message.variants.isEmpty()) {
            return null
        }

        val currentUserId = userId ?: return message.variants[0]
        val messageId = message.id ?: ""

        val index = abs((currentUserId + messageId).hashCode()) % message.variants.size

        return message.variants[index]
    }

    private fun isMessageInDateRange(message: NotificationMessage): Boolean {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val today = Date()

        val startDateString = message.startDate
        val endDateString = message.endDate

        if (startDateString != null) {
            try {
                val startDate = dateFormat.parse(startDateString)

                if (startDate != null && today.before(startDate)) {
                    return false
                }
            } catch (e: Exception) {
                return false
            }
        }

        if (endDateString != null) {
            try {
                val endDate = dateFormat.parse(endDateString)

                if (endDate != null && today.after(endDate)) {
                    return false
                }
            } catch (e: Exception) {
                return false
            }
        }
        return true
    }
}