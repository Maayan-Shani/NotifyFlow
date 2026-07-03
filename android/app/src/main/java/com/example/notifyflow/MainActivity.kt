package com.example.notifyflow

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.Fragment
import com.example.notifyflow.fragments.CartFragment
import com.example.notifyflow.fragments.HomeFragment
import com.example.notifyflow.fragments.ProfileFragment
import com.example.notifyflowlibrary.NotifyFlow
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    private lateinit var userSpinner: Spinner
    private lateinit var countrySpinner: Spinner

    private lateinit var resetViewsBTN: Button
    private lateinit var sdkStatusTXT: TextView

    private lateinit var bottomNAV: BottomNavigationView

    private val demoApiKey = "demo_api_key"

    private val demoBaseUrl = BuildConfig.NOTIFYFLOW_BASE_URL


    private var currentScreenName = "home_screen"
    private var allowSpinnerAutoRefresh = false

    private var hasCompletedFirstResume = false

    private var lastSelectedUserId: String? = null
    private var lastSelectedCountry: String? = null
    private val checkHandler = Handler(Looper.getMainLooper())
    private var pendingCheckRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(
                systemBars.left,
                systemBars.top,
                systemBars.right,
                0
            )
            insets
        }

        findViews()
        setupSpinners()
        initViews()

        initializeAndFetchSdkAutomatically()

        if (savedInstanceState == null) {
            currentScreenName = "home_screen"
            openFragment(HomeFragment())
            checkScreenAfterDelay(currentScreenName, 1200)
        }

        setupSpinnerAutoRefresh()

        userSpinner.post {
            countrySpinner.post {
                allowSpinnerAutoRefresh = true
            }
        }
    }

    private fun findViews() {
        userSpinner = findViewById(R.id.user_SPINNER)
        countrySpinner = findViewById(R.id.country_SPINNER)

        resetViewsBTN = findViewById(R.id.reset_views_BTN)
        sdkStatusTXT = findViewById(R.id.sdk_status_TXT)

        bottomNAV = findViewById(R.id.bottom_NAV)
    }

    private fun setupSpinners() {
        val users = arrayListOf("user_1", "user_2", "user_3")
        val countries = arrayListOf("IL", "US", "FR")

        val usersAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            users
        )
        usersAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        userSpinner.adapter = usersAdapter

        val countriesAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            countries
        )
        countriesAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        countrySpinner.adapter = countriesAdapter
    }

    private fun initViews() {
        resetViewsBTN.setOnClickListener {
            NotifyFlow.resetViewsForTesting()
            sdkStatusTXT.text = "Demo state was reset"

            checkScreenAfterDelay(currentScreenName, 700)
        }

        bottomNAV.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    currentScreenName = "home_screen"
                    openFragment(HomeFragment())
                    //refreshMessagesAndCheckScreen(currentScreenName)
                    checkScreenAfterDelay(currentScreenName)
                    true
                }

                R.id.nav_profile -> {
                    currentScreenName = "profile_screen"
                    openFragment(ProfileFragment())
                    //refreshMessagesAndCheckScreen(currentScreenName)
                    checkScreenAfterDelay(currentScreenName)
                    true
                }

                R.id.nav_cart -> {
                    currentScreenName = "cart_screen"
                    openFragment(CartFragment())
                    //refreshMessagesAndCheckScreen(currentScreenName)
                    checkScreenAfterDelay(currentScreenName)
                    true
                }

                else -> false
            }
        }
    }

    private fun setupSpinnerAutoRefresh() {
        val spinnerListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(
                parent: AdapterView<*>?,
                view: android.view.View?,
                position: Int,
                id: Long
            ) {
                if (!allowSpinnerAutoRefresh) {
                    return
                }

                val selectedUserId = userSpinner.selectedItem.toString()
                val selectedCountry = countrySpinner.selectedItem.toString()

                if (
                    selectedUserId == lastSelectedUserId &&
                    selectedCountry == lastSelectedCountry
                ) {
                    return
                }

                initializeAndFetchSdkAutomatically()
                checkScreenAfterDelay(currentScreenName, 1200)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                // No action needed
            }
        }

        userSpinner.onItemSelectedListener = spinnerListener
        countrySpinner.onItemSelectedListener = spinnerListener
    }

    private fun initializeAndFetchSdkAutomatically() {
        val selectedUserId = userSpinner.selectedItem.toString()
        val selectedCountry = countrySpinner.selectedItem.toString()

        NotifyFlow.init(
            context = this,
            apiKey = demoApiKey,
            userId = selectedUserId,
            country = selectedCountry,
            baseUrl = demoBaseUrl
        )

        NotifyFlow.fetchMessages()

        lastSelectedUserId = selectedUserId
        lastSelectedCountry = selectedCountry

        sdkStatusTXT.text =
            "SDK ready | userId=$selectedUserId | country=$selectedCountry"
    }

    private fun refreshMessagesOnAppResume() {
        sdkStatusTXT.text = "Refreshing messages from server"

        NotifyFlow.fetchMessages()

        checkScreenAfterDelay(currentScreenName, 1200)
    }

    private fun checkScreenAfterDelay(screenName: String, delayMillis: Long = 700) {
        sdkStatusTXT.text = "Checking messages for $screenName"

        pendingCheckRunnable?.let {
            checkHandler.removeCallbacks(it)
        }

        val checkRunnable = Runnable {
            NotifyFlow.checkAndShow(this, screenName)
            pendingCheckRunnable = null
        }

        pendingCheckRunnable = checkRunnable
        checkHandler.postDelayed(checkRunnable, delayMillis)
    }

    private fun openFragment(fragment: Fragment) {
        supportFragmentManager
            .beginTransaction()
            .replace(R.id.fragments_CONTAINER, fragment)
            .commit()
    }

    override fun onResume() {
        super.onResume()

        if (!hasCompletedFirstResume) {
            hasCompletedFirstResume = true
            return
        }

        refreshMessagesOnAppResume()
    }


    override fun onDestroy() {
        pendingCheckRunnable?.let {
            checkHandler.removeCallbacks(it)
        }

        pendingCheckRunnable = null

        super.onDestroy()
    }

}